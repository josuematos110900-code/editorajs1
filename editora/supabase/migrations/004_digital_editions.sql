-- =====================================================================
-- Edições digitais: e-book e audiolivro
--
--   * Cada livro pode ter edição impressa, e-book e/ou audiolivro, cada
--     uma com o seu preço. Os digitais não têm stock nem portes.
--   * Os ficheiros ficam num bucket PRIVADO («digital»). Só é possível
--     obter um link (temporário) de um ficheiro quem o comprou e pagou —
--     a regra está nas políticas RLS do Storage, não na interface.
--   * Uma encomenda só com livros digitais passa a «Entregue» logo que o
--     pagamento é confirmado (não há nada para enviar).
--   * Reembolso ou cancelamento retiram o acesso automaticamente.
-- =====================================================================

alter table public.books
  add column if not exists ebook_price integer check (ebook_price is null or ebook_price >= 0),
  add column if not exists audiobook_price integer check (audiobook_price is null or audiobook_price >= 0),
  add column if not exists audiobook_narrator text,
  add column if not exists audiobook_minutes integer check (audiobook_minutes is null or audiobook_minutes > 0);

-- «ebook» deixa de ser um formato da ficha: passa a ser uma edição com preço.
update public.books set formats = array_remove(formats, 'ebook') where 'ebook' = any (formats);

create table if not exists public.digital_files (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  kind text not null check (kind in ('ebook', 'audiolivro')),
  title text not null,
  position integer not null default 1,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists digital_files_book_idx on public.digital_files (book_id, kind, position);

alter table public.order_items
  add column if not exists edition text not null default 'fisico' check (edition in ('fisico', 'ebook', 'audiolivro'));

create index if not exists order_items_edition_idx on public.order_items (book_id, edition);

insert into public.delivery_methods (id, label, cost, free_from, requires_address)
values ('digital', 'Entrega digital', 0, null, false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Direito de acesso: comprou e pagou (e não foi reembolsado/cancelado)
-- ---------------------------------------------------------------------
create or replace function public.owns_digital(p_book_id uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.order_items i
    join public.orders o on o.id = i.order_id
    where o.user_id = auth.uid()
      and i.book_id = p_book_id
      and i.edition = p_kind
      and o.status in ('pagamento_confirmado', 'em_preparacao', 'enviado', 'entregue')
  );
$$;

-- Biblioteca do cliente: edições digitais pagas.
create or replace function public.my_library()
returns table (book_id uuid, kind text, purchased_at timestamptz, order_number text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (i.book_id, i.edition) i.book_id, i.edition, o.created_at, o.number
  from public.order_items i
  join public.orders o on o.id = i.order_id
  where o.user_id = auth.uid()
    and i.edition in ('ebook', 'audiolivro')
    and o.status in ('pagamento_confirmado', 'em_preparacao', 'enviado', 'entregue')
  order by i.book_id, i.edition, o.created_at;
$$;

revoke execute on function public.my_library() from public, anon;
grant execute on function public.my_library() to authenticated;

-- Metadados dos ficheiros (títulos dos capítulos, tamanhos) são públicos
-- para livros publicados; o CONTEÚDO só se obtém pelo Storage, abaixo.
alter table public.digital_files enable row level security;
create policy digital_files_read on public.digital_files for select using (
  public.is_admin() or exists (select 1 from public.books b where b.id = book_id and b.published)
);
create policy digital_files_admin on public.digital_files for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Armazenamento privado dos ficheiros digitais
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'digital', 'digital', false, 524288000,
  array['application/pdf', 'application/epub+zip', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/ogg']
)
on conflict (id) do nothing;

create policy digital_owner_read on storage.objects for select using (
  bucket_id = 'digital'
  and (
    public.is_admin()
    or exists (
      select 1 from public.digital_files f
      where f.storage_path = name and public.owns_digital(f.book_id, f.kind)
    )
  )
);
create policy digital_admin_insert on storage.objects for insert with check (bucket_id = 'digital' and public.is_admin());
create policy digital_admin_update on storage.objects for update using (bucket_id = 'digital' and public.is_admin());
create policy digital_admin_delete on storage.objects for delete using (bucket_id = 'digital' and public.is_admin());

-- ---------------------------------------------------------------------
-- Estados: encomendas só digitais entregam-se ao confirmar o pagamento
-- ---------------------------------------------------------------------
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
begin
  select status into v_current from public.orders where id = p_order_id for update;
  if v_current is null then
    raise exception 'Encomenda não encontrada.' using errcode = 'P0002';
  end if;
  if v_current = p_status then
    return;
  end if;
  if v_current not in ('cancelado', 'reembolsado') and p_status in ('cancelado', 'reembolsado') then
    perform public.release_order_stock(p_order_id);
  end if;
  update public.orders set status = p_status where id = p_order_id;

  if p_status = 'pagamento_confirmado'
     and not exists (select 1 from public.order_items where order_id = p_order_id and edition = 'fisico') then
    update public.orders set status = 'entregue' where id = p_order_id;
  end if;
end;
$$;

revoke execute on function public.set_order_status(uuid, text) from public, anon, authenticated;

-- Stock/reservas só existem para o livro físico.
create or replace function public.release_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  for v_item in select * from public.order_items where order_id = p_order_id and edition = 'fisico' order by book_id loop
    if v_item.is_preorder then
      update public.preorders set reserved = greatest(reserved - v_item.quantity, 0) where book_id = v_item.book_id;
    else
      update public.books set stock = stock + v_item.quantity where id = v_item.book_id;
    end if;
  end loop;
end;
$$;

revoke execute on function public.release_order_stock(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- place_order com edições. p_items: [{"book_id", "quantity", "edition"}]
-- ("edition" em falta = "fisico", compatível com a versão anterior).
-- ---------------------------------------------------------------------
create or replace function public.place_order(
  p_items jsonb,
  p_customer jsonb,
  p_address jsonb,
  p_delivery_method text,
  p_payment_method text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_method public.delivery_methods;
  v_line record;
  v_book public.books;
  v_pre public.preorders;
  v_has_pre boolean;
  v_is_pre boolean;
  v_unit integer;
  v_list integer;
  v_gross integer := 0;
  v_net integer := 0;
  v_physical_net integer := 0;
  v_has_physical boolean := false;
  v_shipping integer;
  v_order_id uuid;
  v_address_id uuid;
  v_number text;
  v_label text;
  v_name text := trim(coalesce(p_customer ->> 'fullName', ''));
  v_email text := lower(trim(coalesce(p_customer ->> 'email', '')));
  v_phone text := trim(coalesce(p_customer ->> 'phone', ''));
begin
  if v_user is null then
    raise exception 'Inicie sessão para finalizar a compra.' using errcode = '28000';
  end if;
  if length(v_name) < 3 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or v_phone !~ '^\+?[0-9 ()-]{7,20}$' then
    raise exception 'Dados do cliente inválidos.' using errcode = '22023';
  end if;
  if p_payment_method not in ('referencia', 'transferencia', 'gateway') then
    raise exception 'Método de pagamento inválido.' using errcode = '22023';
  end if;
  select * into v_method from public.delivery_methods where id = p_delivery_method and active;
  if not found then
    raise exception 'Método de entrega inválido.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'O carrinho está vazio.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) e where coalesce(e ->> 'edition', 'fisico') not in ('fisico', 'ebook', 'audiolivro')) then
    raise exception 'Edição inválida.' using errcode = '22023';
  end if;

  v_has_physical := exists (select 1 from jsonb_array_elements(p_items) e where coalesce(e ->> 'edition', 'fisico') = 'fisico');
  if v_has_physical and v_method.id = 'digital' then
    raise exception 'Escolha como quer receber os livros físicos.' using errcode = '22023';
  end if;
  if not v_has_physical and v_method.id <> 'digital' then
    raise exception 'Os livros digitais não têm entrega física.' using errcode = '22023';
  end if;

  v_number := 'ED-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.orders (number, user_id, customer_name, customer_email, customer_phone, delivery_method, subtotal, shipping_cost, discount, total)
  values (v_number, v_user, v_name, v_email, v_phone, v_method.id, 0, 0, 0, 0)
  returning id into v_order_id;

  -- Agrupado por livro e edição, ordenado por livro (ordem de bloqueio estável).
  for v_line in
    select (e ->> 'book_id')::uuid as book_id, coalesce(e ->> 'edition', 'fisico') as edition, sum((e ->> 'quantity')::int)::int as quantity
    from jsonb_array_elements(p_items) e
    group by 1, 2
    order by 1, 2
  loop
    if v_line.quantity < 1 or v_line.quantity > 10 then
      raise exception 'Quantidade inválida (máximo 10 por livro).' using errcode = '22023';
    end if;

    select * into v_book from public.books where id = v_line.book_id and published for update;
    if not found then
      raise exception 'Um dos livros do carrinho já não está disponível.' using errcode = 'P0001';
    end if;

    if v_line.edition <> 'fisico' then
      v_label := case v_line.edition when 'ebook' then 'e-book' else 'audiolivro' end;
      v_unit := case v_line.edition when 'ebook' then v_book.ebook_price else v_book.audiobook_price end;
      if v_line.quantity <> 1 then
        raise exception 'O % de «%» compra-se uma vez por conta.', v_label, v_book.title using errcode = 'P0001';
      end if;
      if v_unit is null
         or (v_book.publication_date is not null and v_book.publication_date > current_date)
         or not exists (select 1 from public.digital_files f where f.book_id = v_book.id and f.kind = v_line.edition) then
        raise exception 'O % de «%» não está disponível.', v_label, v_book.title using errcode = 'P0001';
      end if;
      if public.owns_digital(v_book.id, v_line.edition) then
        raise exception 'Já comprou o % de «%» — está na sua biblioteca.', v_label, v_book.title using errcode = 'P0001';
      end if;
      v_list := v_unit;
      v_is_pre := false;
    else
      if not (v_book.formats && array['capa_mole', 'capa_dura']) then
        raise exception '«%» não tem edição impressa.', v_book.title using errcode = 'P0001';
      end if;
      select * into v_pre from public.preorders where book_id = v_book.id for update;
      v_has_pre := found;
      v_is_pre := v_has_pre and public.preorder_state(v_pre) = 'aberta';

      if v_is_pre then
        if v_pre.unit_limit is not null and v_pre.reserved + v_line.quantity > v_pre.unit_limit then
          raise exception 'Restam apenas % unidade(s) em pré-venda de «%».', greatest(v_pre.unit_limit - v_pre.reserved, 0), v_book.title using errcode = 'P0001';
        end if;
        update public.preorders set reserved = reserved + v_line.quantity where id = v_pre.id;
        v_unit := v_pre.special_price;
      else
        if v_has_pre and public.preorder_state(v_pre) = 'esgotada' then
          raise exception 'A pré-venda de «%» esgotou — todos os exemplares foram reservados.', v_book.title using errcode = 'P0001';
        end if;
        if v_book.publication_date is not null and v_book.publication_date > current_date then
          raise exception '«%» ainda não está disponível para compra.', v_book.title using errcode = 'P0001';
        end if;
        if v_book.stock < v_line.quantity then
          raise exception 'Restam apenas % exemplar(es) de «%».', v_book.stock, v_book.title using errcode = 'P0001';
        end if;
        update public.books set stock = stock - v_line.quantity where id = v_book.id;
        v_unit := v_book.price;
      end if;
      v_list := v_book.price;
      v_physical_net := v_physical_net + v_unit * v_line.quantity;
    end if;

    insert into public.order_items (order_id, book_id, title, quantity, unit_price, list_price, is_preorder, edition)
    values (v_order_id, v_book.id, v_book.title, v_line.quantity, v_unit, v_list, v_is_pre, v_line.edition);

    v_gross := v_gross + v_list * v_line.quantity;
    v_net := v_net + v_unit * v_line.quantity;
  end loop;

  -- Portes só sobre os livros físicos.
  v_shipping := case
    when not v_has_physical then 0
    when v_method.free_from is not null and v_physical_net >= v_method.free_from then 0
    else v_method.cost
  end;

  if v_method.requires_address then
    if length(trim(coalesce(p_address ->> 'country', ''))) < 2
       or length(trim(coalesce(p_address ->> 'city', ''))) < 2
       or length(trim(coalesce(p_address ->> 'line1', ''))) < 5 then
      raise exception 'Morada de entrega incompleta.' using errcode = '22023';
    end if;
    insert into public.addresses (user_id, country, city, line1, line2, postal_code)
    values (
      v_user,
      trim(p_address ->> 'country'),
      trim(p_address ->> 'city'),
      trim(p_address ->> 'line1'),
      nullif(trim(coalesce(p_address ->> 'line2', '')), ''),
      nullif(trim(coalesce(p_address ->> 'postalCode', '')), '')
    )
    returning id into v_address_id;
  end if;

  update public.orders
  set subtotal = v_gross,
      discount = v_gross - v_net,
      shipping_cost = v_shipping,
      total = v_net + v_shipping,
      address_id = v_address_id
  where id = v_order_id;

  insert into public.payments (order_id, method, amount, provider)
  values (v_order_id, p_payment_method, v_net + v_shipping, case when p_payment_method = 'gateway' then 'gateway' else 'manual' end);

  update public.profiles
  set full_name = case when full_name = '' then v_name else full_name end,
      phone = case when phone = '' then v_phone else phone end
  where id = v_user;

  return v_order_id;
end;
$$;

revoke execute on function public.place_order(jsonb, jsonb, jsonb, text, text) from public, anon;
grant execute on function public.place_order(jsonb, jsonb, jsonb, text, text) to authenticated;
