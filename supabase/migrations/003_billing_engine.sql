-- =====================================================================
-- FinançasPro — Migration 003: Billing Engine (Fase 3) + Histórico +
-- Admin billing. Aplicar no SQL Editor do Supabase depois de
-- 002_security_hardening.sql (idempotente).
--
-- Resumo:
--   A. billing_events ganha amount/currency/status (Fase 11 — histórico)
--   B. expire_subscriptions() — transição automática canceled/past_due
--      → free depois do fim do período pago (espelha expire_trials())
--   C. get_my_billing_history() — RPC para o próprio utilizador ver o
--      seu histórico de pagamentos, sem expor o payload cru do webhook
--   D. get_admin_metrics() ganha canceled_users/expired_users
--   E. get_admin_billing_metrics() — pagamentos/renovações/reembolsos/
--      chargebacks para o painel administrativo (Fase 14), só com
--      dados reais de billing_events — nunca inventa receita
-- =====================================================================

-- ---------------------------------------------------------------------
-- A. billing_events: colunas para o histórico de faturação
-- ---------------------------------------------------------------------
alter table public.billing_events add column if not exists amount numeric;
alter table public.billing_events add column if not exists currency text;
alter table public.billing_events add column if not exists status text;

comment on column public.billing_events.status is
  'succeeded | canceled | failed | refunded | chargeback | ignored | user_not_found — resultado de negócio deste evento, para o histórico de faturação (nunca o payload cru).';

-- ---------------------------------------------------------------------
-- B. expire_subscriptions — fecha o acesso Premium depois do período
-- ---------------------------------------------------------------------
-- Um "canceled" continua Premium até current_period_end (ver
-- has_active_premium() em 002_security_hardening.sql). Depois dessa
-- data, ou quando um "past_due" fica sem pagar além do próprio período,
-- este job passa a subscrição para Free — sem apagar nenhum dado do
-- utilizador (contas, transações, metas, etc. continuam intactas).
create or replace function public.expire_subscriptions()
returns void
language sql
security definer
set search_path = public
as $$
  update public.subscriptions
  set plan = 'free', status = 'expired'
  where plan = 'premium'
    and status in ('canceled', 'past_due')
    and current_period_end is not null
    and current_period_end < current_date;
$$;

select cron.unschedule('expire-subscriptions-daily') where exists (
  select 1 from cron.job where jobname = 'expire-subscriptions-daily'
);
select cron.schedule('expire-subscriptions-daily', '15 3 * * *', 'select public.expire_subscriptions();');

-- ---------------------------------------------------------------------
-- C. get_my_billing_history — Fase 11, o próprio utilizador vê o seu
--    histórico (data, valor, moeda, fornecedor, status, referência).
--    Nunca expõe billing_events.payload (pode conter dados sensíveis
--    do cliente/cartão consoante o fornecedor).
-- ---------------------------------------------------------------------
create or replace function public.get_my_billing_history(p_limit integer default 50)
returns table (
  id uuid,
  provider text,
  event_type text,
  status text,
  amount numeric,
  currency text,
  reference text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    b.id, b.provider, b.event_type, b.status, b.amount, b.currency,
    b.event_id as reference, b.created_at
  from public.billing_events b
  where b.user_id = auth.uid() and b.processed = true
  order by b.created_at desc
  limit greatest(1, least(p_limit, 200));
$$;

grant execute on function public.get_my_billing_history(integer) to authenticated;

-- ---------------------------------------------------------------------
-- D. get_admin_metrics — acrescenta canceled_users/expired_users
-- ---------------------------------------------------------------------
create or replace function public.get_admin_metrics()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_admin(auth.uid()) then
    return null;
  end if;

  select json_build_object(
    'total_users', (select count(*) from public.profiles),
    'free_users', (select count(*) from public.subscriptions where plan = 'free'),
    'trialing_users', (select count(*) from public.subscriptions where status = 'trialing'),
    'premium_active_users', (select count(*) from public.subscriptions where plan = 'premium' and status = 'active'),
    'past_due_users', (select count(*) from public.subscriptions where status = 'past_due'),
    'canceled_users', (select count(*) from public.subscriptions where status = 'canceled'),
    'expired_users', (select count(*) from public.subscriptions where status = 'expired'),
    'signups_last_30_days', (select count(*) from public.profiles where created_at >= current_date - interval '30 days')
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_admin_metrics() to authenticated;

-- ---------------------------------------------------------------------
-- E. get_admin_billing_metrics — Fase 14, só admins. Conta eventos reais
--    de billing_events; nunca soma/estima receita que não veio do
--    fornecedor (se "amount" for null para um evento, esse evento entra
--    na contagem mas não na soma).
-- ---------------------------------------------------------------------
create or replace function public.get_admin_billing_metrics()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_admin(auth.uid()) then
    return null;
  end if;

  select json_build_object(
    'payments_count', (select count(*) from public.billing_events where status = 'succeeded'),
    'renewals_count', (select count(*) from public.billing_events where status = 'succeeded' and event_type = 'subscription_renewed'),
    'refunds_count', (select count(*) from public.billing_events where status = 'refunded'),
    'chargebacks_count', (select count(*) from public.billing_events where status = 'chargeback'),
    'failed_count', (select count(*) from public.billing_events where status = 'failed'),
    'revenue_captured', (select coalesce(sum(amount), 0) from public.billing_events where status = 'succeeded' and amount is not null),
    'revenue_currency', 'BRL'
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_admin_billing_metrics() to authenticated;

-- ---------------------------------------------------------------------
-- get_admin_billing_events — lista bruta para o painel admin (Fase 14),
-- ainda sem o payload cru do webhook.
-- ---------------------------------------------------------------------
create or replace function public.get_admin_billing_events(p_limit integer default 100)
returns table (
  id uuid,
  provider text,
  event_type text,
  status text,
  amount numeric,
  currency text,
  user_email text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select b.id, b.provider, b.event_type, b.status, b.amount, b.currency, u.email, b.created_at
  from public.billing_events b
  left join auth.users u on u.id = b.user_id
  where public.is_admin(auth.uid())
  order by b.created_at desc
  limit greatest(1, least(p_limit, 500));
$$;

grant execute on function public.get_admin_billing_events(integer) to authenticated;
