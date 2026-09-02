-- =====================================================================
-- FinançasPro — Migration 004: Race conditions nos limites do Free (Fase 17)
-- Aplicar depois de 003_billing_engine.sql (idempotente).
--
-- Problema: create_account/create_goal/create_debt/
-- create_recurring_payment/upsert_budget faziam "SELECT count(*) ...
-- IF count >= limite" e só a seguir o INSERT, tudo dentro da mesma
-- função, mas em transações SEPARADAS por pedido. Sob READ COMMITTED
-- (omissão do Postgres), dois pedidos concorrentes para o 3º recurso
-- no Free podiam ambos ler count=2 antes de qualquer um confirmar o
-- INSERT — os dois passavam, e o limite era ultrapassado.
--
-- Correção: cada função adquire um pg_advisory_xact_lock por
-- (utilizador, tipo de recurso) mesmo antes de contar. É um lock
-- transacional — liberta-se sozinho no fim da transação (commit ou
-- rollback), nunca precisa de "unlock" manual. Dois pedidos do MESMO
-- utilizador para o MESMO recurso passam a ficar em fila: o segundo só
-- conta depois do primeiro terminar, por isso já vê o INSERT anterior.
-- Pedidos de utilizadores diferentes, ou para recursos diferentes,
-- continuam totalmente paralelos — isto não é um lock global.
-- =====================================================================

create or replace function public.create_account(
  p_name text,
  p_type public.account_type default 'dinheiro',
  p_initial_balance numeric default 0,
  p_color text default '#0EA5A5',
  p_icon text default 'wallet'
)
returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
  v_row public.accounts;
begin
  if v_uid is null then raise exception 'UNAUTHORIZED'; end if;
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'INVALID_AMOUNT'; end if;

  if not public.has_active_premium(v_uid) then
    perform pg_advisory_xact_lock(hashtextextended(v_uid::text || '|accounts', 0));
    select count(*) into v_count from public.accounts where user_id = v_uid and archived = false;
    if v_count >= 2 then raise exception 'LIMIT_REACHED'; end if;
  end if;

  insert into public.accounts (user_id, name, type, initial_balance, color, icon)
  values (v_uid, p_name, p_type, coalesce(p_initial_balance, 0), p_color, p_icon)
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.create_goal(
  p_name text,
  p_target_amount numeric,
  p_deadline date default null,
  p_color text default '#0EA5A5',
  p_icon text default 'target'
)
returns public.goals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
  v_row public.goals;
begin
  if v_uid is null then raise exception 'UNAUTHORIZED'; end if;
  if p_target_amount is null or p_target_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  if not public.has_active_premium(v_uid) then
    perform pg_advisory_xact_lock(hashtextextended(v_uid::text || '|goals', 0));
    select count(*) into v_count from public.goals where user_id = v_uid and status = 'em_progresso';
    if v_count >= 2 then raise exception 'LIMIT_REACHED'; end if;
  end if;

  insert into public.goals (user_id, name, target_amount, deadline, color, icon)
  values (v_uid, p_name, p_target_amount, p_deadline, p_color, p_icon)
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.create_debt(
  p_name text,
  p_creditor text default '',
  p_total_amount numeric default 0,
  p_installment_amount numeric default 0,
  p_due_date date default null,
  p_interest_rate numeric default 0,
  p_notes text default ''
)
returns public.debts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
  v_row public.debts;
begin
  if v_uid is null then raise exception 'UNAUTHORIZED'; end if;
  if p_total_amount is null or p_total_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  if not public.has_active_premium(v_uid) then
    perform pg_advisory_xact_lock(hashtextextended(v_uid::text || '|debts', 0));
    select count(*) into v_count from public.debts where user_id = v_uid and status = 'ativa';
    if v_count >= 2 then raise exception 'LIMIT_REACHED'; end if;
  end if;

  insert into public.debts (user_id, name, creditor, total_amount, installment_amount, due_date, interest_rate, notes)
  values (v_uid, p_name, coalesce(p_creditor, ''), p_total_amount, coalesce(p_installment_amount, 0), p_due_date, coalesce(p_interest_rate, 0), coalesce(p_notes, ''))
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.create_recurring_payment(
  p_name text,
  p_amount numeric,
  p_type public.transaction_type default 'despesa',
  p_frequency public.recurrence_frequency default 'mensal',
  p_next_due_date date default current_date,
  p_category_id uuid default null,
  p_account_id uuid default null
)
returns public.recurring_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
  v_row public.recurring_payments;
begin
  if v_uid is null then raise exception 'UNAUTHORIZED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  if p_category_id is not null and not exists (select 1 from public.categories where id = p_category_id and user_id = v_uid) then
    raise exception 'CATEGORY_NOT_FOUND';
  end if;
  if p_account_id is not null and not exists (select 1 from public.accounts where id = p_account_id and user_id = v_uid) then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;

  if not public.has_active_premium(v_uid) then
    perform pg_advisory_xact_lock(hashtextextended(v_uid::text || '|recurring', 0));
    select count(*) into v_count from public.recurring_payments where user_id = v_uid and active = true;
    if v_count >= 3 then raise exception 'LIMIT_REACHED'; end if;
  end if;

  insert into public.recurring_payments (user_id, name, amount, type, frequency, next_due_date, category_id, account_id)
  values (v_uid, p_name, p_amount, p_type, p_frequency, p_next_due_date, p_category_id, p_account_id)
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.upsert_budget(
  p_category_id uuid,
  p_amount numeric,
  p_month smallint,
  p_year smallint
)
returns public.budgets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
  v_row public.budgets;
begin
  if v_uid is null then raise exception 'UNAUTHORIZED'; end if;
  if p_amount is null or p_amount < 0 then raise exception 'INVALID_AMOUNT'; end if;

  if not exists (select 1 from public.categories where id = p_category_id and user_id = v_uid) then
    raise exception 'CATEGORY_NOT_FOUND';
  end if;

  if not public.has_active_premium(v_uid) then
    perform pg_advisory_xact_lock(hashtextextended(v_uid::text || '|budgets|' || p_month || '|' || p_year, 0));
    if not exists (select 1 from public.budgets where user_id = v_uid and category_id = p_category_id and month = p_month and year = p_year) then
      select count(*) into v_count from public.budgets where user_id = v_uid and month = p_month and year = p_year;
      if v_count >= 5 then raise exception 'LIMIT_REACHED'; end if;
    end if;
  end if;

  insert into public.budgets (user_id, category_id, amount, month, year)
  values (v_uid, p_category_id, p_amount, p_month, p_year)
  on conflict (user_id, category_id, month, year)
  do update set amount = excluded.amount
  returning * into v_row;

  return v_row;
end;
$$;
