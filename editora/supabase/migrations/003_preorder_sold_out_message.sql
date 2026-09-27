-- Mensagem clara quando a pré-venda esgota: antes, quem chegava depois da
-- última unidade (detetado num teste de 60 compras simultâneas) recebia
-- «ainda não está disponível». A lógica de bloqueio e stock não muda.
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
  v_has_pre boolean;
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

