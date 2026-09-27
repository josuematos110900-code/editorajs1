-- =====================================================================
-- Editora — esquema da plataforma de pré-venda (PostgreSQL / Supabase)
--
-- Princípios:
--   * RLS em TODAS as tabelas. O browser só usa a anon key; o que cada
--     pessoa vê/altera é decidido aqui.
--   * Preços, stock e reservas NUNCA vêm do cliente: place_order recalcula
--     tudo a partir da base de dados, dentro de uma transação com bloqueio
--     de linhas (sem overselling em pedidos concorrentes).
--   * Não guardamos dados de cartão. Pagamentos online são tratados pelo
--     provedor; aqui só ficam estado, valor e referência.
--   * Mudanças de estado de encomendas/pagamentos só por funções
--     SECURITY DEFINER com verificação de função (is_admin) ou service_role.
-- =====================================================================

-- gen_random_uuid() é nativo (PG13+). pg_trgm fica no schema "extensions",
-- como é convenção no Supabase.
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- Perfis e funções
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null
);

create table public.authors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  bio text not null default '',
  photo_url text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  subtitle text,
  author_id uuid not null references public.authors (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  synopsis text not null default '',
  description text not null default '',
  pages integer check (pages is null or pages > 0),
  isbn text,
  publisher text not null default '',
  publication_date date,
  formats text[] not null default '{capa_mole}',
  price integer not null check (price >= 0),
  compare_at_price integer check (compare_at_price is null or compare_at_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  cover_url text,
  gallery text[] not null default '{}',
  cover_color text not null default '#2A2723',
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index books_published_date_idx on public.books (published, publication_date desc);
create index books_author_idx on public.books (author_id);
create index books_category_idx on public.books (category_id);
create index books_title_trgm_idx on public.books using gin (title extensions.gin_trgm_ops);

create table public.preorders (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null unique references public.books (id) on delete cascade,
  enabled boolean not null default true,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  unit_limit integer check (unit_limit is null or unit_limit > 0),
  special_price integer not null check (special_price >= 0),
  expected_ship_date date,
  benefits text[] not null default '{}',
  -- Mantido por place_order / release_order_stock (nunca pelo cliente).
  reserved integer not null default 0 check (reserved >= 0),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index preorders_window_idx on public.preorders (enabled, starts_at, ends_at);

-- Métodos de entrega: a interface mostra config/site.ts, mas é ESTA
-- tabela que define o valor cobrado. Manter os dois sincronizados.
create table public.delivery_methods (
  id text primary key,
  label text not null,
  cost integer not null check (cost >= 0),
  free_from integer,
  requires_address boolean not null default true,
  active boolean not null default true
);

insert into public.delivery_methods (id, label, cost, free_from, requires_address) values
  ('levantamento', 'Levantamento na editora', 0, null, false),
  ('luanda', 'Entrega em Luanda', 2500, 30000, true),
  ('provincias', 'Outras províncias', 5000, 50000, true),
  ('internacional', 'Envio internacional', 15000, null, true);

-- ---------------------------------------------------------------------
-- Encomendas e pagamentos
-- ---------------------------------------------------------------------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  country text not null,
  city text not null,
  line1 text not null,
  line2 text,
  postal_code text,
  created_at timestamptz not null default now()
);

create index addresses_user_idx on public.addresses (user_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  user_id uuid not null references public.profiles (id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  address_id uuid references public.addresses (id) on delete set null,
  delivery_method text not null references public.delivery_methods (id),
  subtotal integer not null,
  shipping_cost integer not null,
  discount integer not null default 0,
  total integer not null check (total >= 0),
  status text not null default 'pendente' check (status in (
    'pendente', 'pagamento_confirmado', 'em_preparacao', 'enviado', 'entregue', 'cancelado', 'reembolsado'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete restrict,
  title text not null,
  quantity integer not null check (quantity between 1 and 10),
  unit_price integer not null check (unit_price >= 0),
  list_price integer not null check (list_price >= 0),
  is_preorder boolean not null default false
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_book_idx on public.order_items (book_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  method text not null check (method in ('referencia', 'transferencia', 'gateway')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado', 'cancelado', 'reembolsado')),
  amount integer not null,
  provider text,
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_status_idx on public.payments (status);

-- Registo de webhooks recebidos: garante idempotência (o mesmo evento
-- entregue várias vezes só é aplicado uma vez) e fica para auditoria.
create table public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_id text not null,
  order_id uuid references public.orders (id) on delete set null,
  status text not null,
  payload jsonb not null default '{}',
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.authors enable row level security;
alter table public.books enable row level security;
alter table public.preorders enable row level security;
alter table public.delivery_methods enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- Perfis: cada um vê e edita o seu; só nome e telefone são editáveis
-- (o papel "admin" só se atribui por SQL, nunca pela aplicação).
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Catálogo: leitura pública do que está publicado; escrita só admin.
create policy categories_read on public.categories for select using (true);
create policy categories_admin on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy authors_read on public.authors for select using (true);
create policy authors_admin on public.authors for all using (public.is_admin()) with check (public.is_admin());

create policy books_read on public.books for select using (published or public.is_admin());
create policy books_admin on public.books for all using (public.is_admin()) with check (public.is_admin());

create policy preorders_read on public.preorders for select using (
  public.is_admin() or exists (select 1 from public.books b where b.id = book_id and b.published)
);
create policy preorders_admin on public.preorders for all using (public.is_admin()) with check (public.is_admin());
-- "reserved" é gerido só pelas funções de encomenda: nem o admin o altera
-- diretamente (privilégios por coluna).
revoke insert, update on public.preorders from anon, authenticated;
grant insert (book_id, enabled, starts_at, ends_at, unit_limit, special_price, expected_ship_date, benefits) on public.preorders to authenticated;
grant update (enabled, starts_at, ends_at, unit_limit, special_price, expected_ship_date, benefits) on public.preorders to authenticated;

create policy delivery_read on public.delivery_methods for select using (true);
create policy delivery_admin on public.delivery_methods for all using (public.is_admin()) with check (public.is_admin());

-- Encomendas: o cliente só LÊ as suas. Nada de insert/update direto —
-- tudo passa por place_order / cancel_my_order / funções de admin.
create policy addresses_read on public.addresses for select using (user_id = auth.uid() or public.is_admin());
create policy orders_read on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy order_items_read on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
);
create policy payments_read on public.payments for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
);

-- payment_events: sem políticas → só service_role (webhook) acede.
create policy newsletter_admin_read on public.newsletter_subscribers for select using (public.is_admin());
create policy newsletter_admin_delete on public.newsletter_subscribers for delete using (public.is_admin());

-- ---------------------------------------------------------------------
-- Regras de negócio
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger books_touch before update on public.books for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

-- Espelha src/lib/preorder.ts > getPreorderState.
create or replace function public.preorder_state(p public.preorders, p_at timestamptz default now())
returns text
language sql
stable
as $$
  select case
    when p.unit_limit is not null and p.reserved >= p.unit_limit then 'esgotada'
    when not p.enabled then 'encerrada'
    when p_at < p.starts_at then 'em_breve'
    when p_at >= p.ends_at then 'encerrada'
    else 'aberta'
  end;
$$;

-- Subscrição da newsletter sem expor a tabela (nem revelar se o e-mail já existia).
create or replace function public.subscribe_newsletter(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  insert into public.newsletter_subscribers (email) values (v_email) on conflict (email) do nothing;
end;
$$;

grant execute on function public.subscribe_newsletter(text) to anon, authenticated;

-- Cria a encomenda de forma atómica. p_items: [{"book_id": uuid, "quantity": int}]
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
  v_is_pre boolean;
  v_unit integer;
  v_gross integer := 0;
  v_net integer := 0;
  v_shipping integer;
  v_order_id uuid;
  v_address_id uuid;
  v_number text;
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

  v_number := 'ED-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.orders (number, user_id, customer_name, customer_email, customer_phone, delivery_method, subtotal, shipping_cost, discount, total)
  values (v_number, v_user, v_name, v_email, v_phone, v_method.id, 0, 0, 0, 0)
  returning id into v_order_id;

  -- Linhas agrupadas por livro e ordenadas por id (ordem de bloqueio
  -- estável → sem deadlocks entre encomendas concorrentes).
  for v_line in
    select (e ->> 'book_id')::uuid as book_id, sum((e ->> 'quantity')::int)::int as quantity
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1
  loop
    if v_line.quantity < 1 or v_line.quantity > 10 then
      raise exception 'Quantidade inválida (máximo 10 por livro).' using errcode = '22023';
    end if;

    select * into v_book from public.books where id = v_line.book_id and published for update;
    if not found then
      raise exception 'Um dos livros do carrinho já não está disponível.' using errcode = 'P0001';
    end if;

    select * into v_pre from public.preorders where book_id = v_book.id for update;
    v_is_pre := found and public.preorder_state(v_pre) = 'aberta';

    if v_is_pre then
      if v_pre.unit_limit is not null and v_pre.reserved + v_line.quantity > v_pre.unit_limit then
        raise exception 'Restam apenas % unidade(s) em pré-venda de «%».', greatest(v_pre.unit_limit - v_pre.reserved, 0), v_book.title using errcode = 'P0001';
      end if;
      update public.preorders set reserved = reserved + v_line.quantity where id = v_pre.id;
      v_unit := v_pre.special_price;
    else
      if v_book.publication_date is not null and v_book.publication_date > current_date then
        raise exception '«%» ainda não está disponível para compra.', v_book.title using errcode = 'P0001';
      end if;
      if v_book.stock < v_line.quantity then
        raise exception 'Restam apenas % exemplar(es) de «%».', v_book.stock, v_book.title using errcode = 'P0001';
      end if;
      update public.books set stock = stock - v_line.quantity where id = v_book.id;
      v_unit := v_book.price;
    end if;

    insert into public.order_items (order_id, book_id, title, quantity, unit_price, list_price, is_preorder)
    values (v_order_id, v_book.id, v_book.title, v_line.quantity, v_unit, v_book.price, v_is_pre);

    v_gross := v_gross + v_book.price * v_line.quantity;
    v_net := v_net + v_unit * v_line.quantity;
  end loop;

  v_shipping := case when v_method.free_from is not null and v_net >= v_method.free_from then 0 else v_method.cost end;

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

-- Devolve stock/reservas de uma encomenda (interna).
create or replace function public.release_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  for v_item in select * from public.order_items where order_id = p_order_id order by book_id loop
    if v_item.is_preorder then
      update public.preorders set reserved = greatest(reserved - v_item.quantity, 0) where book_id = v_item.book_id;
    else
      update public.books set stock = stock + v_item.quantity where id = v_item.book_id;
    end if;
  end loop;
end;
$$;

revoke execute on function public.release_order_stock(uuid) from public, anon, authenticated;

-- Muda o estado de uma encomenda aplicando os efeitos colaterais (interna).
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
end;
$$;

revoke execute on function public.set_order_status(uuid, text) from public, anon, authenticated;

-- Aplica um novo estado de pagamento (espelha orderStatusAfterPayment).
create or replace function public.apply_payment_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order text;
  v_payment text;
  v_next text;
begin
  if p_status not in ('pendente', 'aprovado', 'recusado', 'cancelado', 'reembolsado') then
    raise exception 'Estado de pagamento inválido.' using errcode = '22023';
  end if;
  select status into v_order from public.orders where id = p_order_id for update;
  if v_order is null then
    raise exception 'Encomenda não encontrada.' using errcode = 'P0002';
  end if;
  select status into v_payment from public.payments where order_id = p_order_id for update;

  -- Espelha nextPaymentStatus (src/lib/orderStatus.ts): eventos fora de
  -- ordem nunca fazem recuar um pagamento aprovado ou reembolsado.
  if v_payment = 'reembolsado'
     or (v_payment = 'aprovado' and p_status in ('pendente', 'recusado', 'cancelado')) then
    return;
  end if;

  update public.payments set status = p_status where order_id = p_order_id;

  v_next := case
    when p_status = 'aprovado' and v_order = 'pendente' then 'pagamento_confirmado'
    when p_status in ('recusado', 'cancelado') and v_order = 'pendente' then 'cancelado'
    when p_status = 'reembolsado' and v_order <> 'cancelado' then 'reembolsado'
    else v_order
  end;
  perform public.set_order_status(p_order_id, v_next);
end;
$$;

revoke execute on function public.apply_payment_status(uuid, text) from public, anon, authenticated;

-- Chamado APENAS pela Edge Function payment-webhook (service_role),
-- depois de validada a assinatura. Idempotente por (provider, event_id).
create or replace function public.apply_payment_event(
  p_provider text,
  p_event_id text,
  p_order_number text,
  p_status text,
  p_amount integer,
  p_reference text,
  p_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where number = p_order_number;

  insert into public.payment_events (provider, event_id, order_id, status, payload)
  values (p_provider, p_event_id, v_order.id, p_status, coalesce(p_payload, '{}'))
  on conflict (provider, event_id) do nothing;
  if not found then
    return 'duplicado';
  end if;

  if v_order.id is null then
    return 'encomenda_desconhecida';
  end if;

  -- Nunca confirmar um pagamento com valor diferente do total da encomenda.
  if p_status = 'aprovado' and p_amount is distinct from v_order.total then
    return 'valor_divergente';
  end if;

  update public.payments set provider_reference = coalesce(p_reference, provider_reference) where order_id = v_order.id;
  perform public.apply_payment_status(v_order.id, p_status);
  return 'aplicado';
end;
$$;

revoke execute on function public.apply_payment_event(text, text, text, text, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_payment_event(text, text, text, text, integer, text, jsonb) to service_role;

-- Cliente: cancelar a própria encomenda enquanto não está paga.
create or replace function public.cancel_my_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Encomenda não encontrada.' using errcode = 'P0002';
  end if;
  if v_order.status <> 'pendente' then
    raise exception 'Só é possível cancelar encomendas ainda por pagar. Contacte-nos.' using errcode = 'P0001';
  end if;
  perform public.apply_payment_status(p_order_id, 'cancelado');
end;
$$;

revoke execute on function public.cancel_my_order(uuid) from public, anon;
grant execute on function public.cancel_my_order(uuid) to authenticated;

-- Admin: mudar estado da encomenda (espelha src/lib/orderStatus.ts).
create or replace function public.admin_update_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
  v_allowed text[];
begin
  if not public.is_admin() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  select status into v_current from public.orders where id = p_order_id;
  if v_current is null then
    raise exception 'Encomenda não encontrada.' using errcode = 'P0002';
  end if;
  v_allowed := case v_current
    when 'pendente' then array['pagamento_confirmado', 'cancelado']
    when 'pagamento_confirmado' then array['em_preparacao', 'cancelado', 'reembolsado']
    when 'em_preparacao' then array['enviado', 'cancelado', 'reembolsado']
    when 'enviado' then array['entregue', 'reembolsado']
    when 'entregue' then array['reembolsado']
    else array[]::text[]
  end;
  if not (p_status = any (v_allowed)) then
    raise exception 'Mudança de estado não permitida.' using errcode = 'P0001';
  end if;

  if p_status = 'pagamento_confirmado' then
    update public.payments set status = 'aprovado' where order_id = p_order_id;
  elsif p_status = 'reembolsado' then
    update public.payments set status = 'reembolsado' where order_id = p_order_id;
  elsif p_status = 'cancelado' then
    update public.payments set status = 'cancelado' where order_id = p_order_id and status = 'pendente';
  end if;
  perform public.set_order_status(p_order_id, p_status);
end;
$$;

revoke execute on function public.admin_update_order_status(uuid, text) from public, anon;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;

-- Admin: registar manualmente o estado do pagamento (referência/transferência).
create or replace function public.admin_set_payment_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  perform public.apply_payment_status(p_order_id, p_status);
end;
$$;

revoke execute on function public.admin_set_payment_status(uuid, text) from public, anon;
grant execute on function public.admin_set_payment_status(uuid, text) to authenticated;

-- Admin: clientes com número de encomendas e total pago.
create or replace function public.admin_customers()
returns table (id uuid, email text, full_name text, phone text, role text, created_at timestamptz, orders bigint, spent bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.email, p.full_name, p.phone, p.role, p.created_at,
         count(o.id) as orders,
         coalesce(sum(o.total) filter (where pay.status = 'aprovado'), 0) as spent
  from public.profiles p
  left join public.orders o on o.user_id = p.id
  left join public.payments pay on pay.order_id = o.id
  where public.is_admin()
  group by p.id
  order by p.created_at desc;
$$;

revoke execute on function public.admin_customers() from public, anon;
grant execute on function public.admin_customers() to authenticated;

-- ---------------------------------------------------------------------
-- Armazenamento de imagens (capas e fotografias de autores)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy media_public_read on storage.objects for select using (bucket_id = 'media');
create policy media_admin_insert on storage.objects for insert with check (bucket_id = 'media' and public.is_admin());
create policy media_admin_update on storage.objects for update using (bucket_id = 'media' and public.is_admin());
create policy media_admin_delete on storage.objects for delete using (bucket_id = 'media' and public.is_admin());
