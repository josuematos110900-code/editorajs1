-- =====================================================================
-- FinançasPro — Schema PostgreSQL / Supabase
-- Executar este ficheiro completo no SQL Editor do Supabase
-- (Project > SQL Editor > New query > colar tudo > Run)
-- =====================================================================

-- ---------------------------------------------------------------------
-- EXTENSÕES
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type transaction_type as enum ('receita', 'despesa', 'transferencia');
exception when duplicate_object then null; end $$;

do $$ begin
  create type recurrence_frequency as enum ('nenhuma', 'semanal', 'quinzenal', 'mensal', 'anual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_status as enum ('em_progresso', 'concluida', 'pausada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type debt_status as enum ('ativa', 'quitada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_type as enum ('dinheiro', 'banco', 'conta_salario', 'poupanca', 'carteira_digital', 'outra');
exception when duplicate_object then null; end $$;

do $$ begin
  create type currency_code as enum ('AOA', 'BRL', 'USD', 'EUR');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('orcamento', 'meta', 'recorrente', 'divida', 'sistema');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- TABELA: profiles
-- Perfil financeiro do utilizador (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  country text not null default 'AO',            -- 'AO' Angola | 'BR' Brasil | outro
  currency currency_code not null default 'AOA',
  monthly_income numeric(14,2) not null default 0,
  income_day smallint not null default 1 check (income_day between 1 and 31),
  main_goal text default '',
  savings_target_percent numeric(5,2) not null default 20 check (savings_target_percent between 0 and 100),
  allocation_needs numeric(5,2) not null default 50,
  allocation_savings numeric(5,2) not null default 20,
  allocation_investments numeric(5,2) not null default 10,
  allocation_leisure numeric(5,2) not null default 10,
  allocation_goals numeric(5,2) not null default 10,
  theme text not null default 'light' check (theme in ('light','dark','system')),
  onboarding_completed boolean not null default false,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil financeiro e preferências de cada utilizador';

-- ---------------------------------------------------------------------
-- TABELA: accounts (contas / carteiras)
-- ---------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type account_type not null default 'dinheiro',
  initial_balance numeric(14,2) not null default 0,
  color text default '#0EA5A5',
  icon text default 'wallet',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_accounts_user on public.accounts(user_id);

-- ---------------------------------------------------------------------
-- TABELA: categories
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type transaction_type not null default 'despesa',
  icon text default 'circle',
  color text default '#64748B',
  is_default boolean not null default false,
  parent_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_user on public.categories(user_id);

-- ---------------------------------------------------------------------
-- TABELA: transactions (receitas, despesas, transferências)
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type transaction_type not null,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  transfer_to_account_id uuid references public.accounts(id) on delete set null,
  date date not null default current_date,
  notes text default '',
  is_recurring boolean not null default false,
  recurring_payment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_transactions_date on public.transactions(user_id, date);
create index if not exists idx_transactions_account on public.transactions(account_id);
create index if not exists idx_transactions_category on public.transactions(category_id);

-- ---------------------------------------------------------------------
-- TABELA: budgets (orçamento por categoria e mês)
-- ---------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  month smallint not null check (month between 1 and 12),
  year smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, month, year)
);

create index if not exists idx_budgets_user_period on public.budgets(user_id, year, month);

-- ---------------------------------------------------------------------
-- TABELA: goals (metas financeiras)
-- ---------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0,
  deadline date,
  status goal_status not null default 'em_progresso',
  color text default '#0EA5A5',
  icon text default 'target',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_goals_user on public.goals(user_id);

-- ---------------------------------------------------------------------
-- TABELA: goal_contributions (poupança associada a metas)
-- ---------------------------------------------------------------------
create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  date date not null default current_date,
  notes text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_goal_contrib_goal on public.goal_contributions(goal_id);

-- ---------------------------------------------------------------------
-- TABELA: debts (dívidas)
-- ---------------------------------------------------------------------
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  creditor text default '',
  total_amount numeric(14,2) not null check (total_amount > 0),
  paid_amount numeric(14,2) not null default 0,
  installment_amount numeric(14,2) default 0,
  due_date date,
  interest_rate numeric(6,3) default 0,
  status debt_status not null default 'ativa',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_debts_user on public.debts(user_id);

-- ---------------------------------------------------------------------
-- TABELA: debt_payments (histórico de pagamentos de dívidas)
-- ---------------------------------------------------------------------
create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_debt_payments_debt on public.debt_payments(debt_id);

-- ---------------------------------------------------------------------
-- TABELA: recurring_payments (pagamentos recorrentes)
-- ---------------------------------------------------------------------
create table if not exists public.recurring_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null check (amount > 0),
  type transaction_type not null default 'despesa',
  frequency recurrence_frequency not null default 'mensal',
  next_due_date date not null,
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recurring_user on public.recurring_payments(user_id);
create index if not exists idx_recurring_due on public.recurring_payments(user_id, next_due_date);

alter table public.transactions
  add constraint fk_transactions_recurring
  foreign key (recurring_payment_id) references public.recurring_payments(id) on delete set null;

-- ---------------------------------------------------------------------
-- TABELA: notifications (alertas)
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type notification_type not null default 'sistema',
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, read);

-- ---------------------------------------------------------------------
-- TABELA: subscriptions (planos Free/Premium — base do futuro micro-SaaS)
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end date,
  trial_reminder_sent boolean not null default false,
  billing_provider text check (billing_provider in ('cakto', 'okanda')),
  auto_renew boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- FUNÇÃO E TRIGGERS: updated_at automático
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['profiles','accounts','transactions','budgets','goals','debts','recurring_payments','subscriptions']
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I;', t);
    execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- =====================================================================
-- FUNÇÃO: criar perfil + categorias padrão automaticamente ao registar
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status, current_period_end)
  values (new.id, 'premium', 'trialing', (current_date + interval '14 days')::date)
  on conflict (user_id) do nothing;

  if not exists (select 1 from public.categories where user_id = new.id) then
    insert into public.categories (user_id, name, type, icon, color, is_default) values
    (new.id, 'Alimentação', 'despesa', 'utensils', '#F59E0B', true),
    (new.id, 'Transporte', 'despesa', 'car', '#3B82F6', true),
    (new.id, 'Casa', 'despesa', 'home', '#8B5CF6', true),
    (new.id, 'Renda', 'despesa', 'building', '#EF4444', true),
    (new.id, 'Água', 'despesa', 'droplet', '#06B6D4', true),
    (new.id, 'Energia', 'despesa', 'zap', '#FACC15', true),
    (new.id, 'Internet', 'despesa', 'wifi', '#6366F1', true),
    (new.id, 'Telefone', 'despesa', 'phone', '#14B8A6', true),
    (new.id, 'Educação', 'despesa', 'graduation-cap', '#0EA5A5', true),
    (new.id, 'Saúde', 'despesa', 'heart-pulse', '#F43F5E', true),
    (new.id, 'Família', 'despesa', 'users', '#EC4899', true),
    (new.id, 'Lazer', 'despesa', 'party-popper', '#A855F7', true),
    (new.id, 'Compras', 'despesa', 'shopping-bag', '#F97316', true),
    (new.id, 'Dívidas', 'despesa', 'credit-card', '#DC2626', true),
    (new.id, 'Investimentos', 'despesa', 'trending-up', '#059669', true),
    (new.id, 'Outros', 'despesa', 'more-horizontal', '#64748B', true),
    (new.id, 'Salário', 'receita', 'briefcase', '#10B981', true),
    (new.id, 'Freelancer', 'receita', 'laptop', '#10B981', true),
    (new.id, 'Negócio', 'receita', 'store', '#10B981', true),
    (new.id, 'Comissão', 'receita', 'percent', '#10B981', true),
    (new.id, 'Trabalhos extras', 'receita', 'hammer', '#10B981', true),
    (new.id, 'Outros rendimentos', 'receita', 'plus-circle', '#10B981', true);
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- ROW LEVEL SECURITY — ativar em todas as tabelas
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.recurring_payments enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;

-- ---- profiles: apenas o próprio utilizador ----
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- ---- helper: política genérica reutilizada por tabela (user_id) ----
-- accounts
drop policy if exists "accounts_all_own" on public.accounts;
create policy "accounts_all_own" on public.accounts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- categories
drop policy if exists "categories_all_own" on public.categories;
create policy "categories_all_own" on public.categories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- transactions
drop policy if exists "transactions_all_own" on public.transactions;
create policy "transactions_all_own" on public.transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- budgets
drop policy if exists "budgets_all_own" on public.budgets;
create policy "budgets_all_own" on public.budgets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- goals
drop policy if exists "goals_all_own" on public.goals;
create policy "goals_all_own" on public.goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- goal_contributions
drop policy if exists "goal_contributions_all_own" on public.goal_contributions;
create policy "goal_contributions_all_own" on public.goal_contributions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- debts
drop policy if exists "debts_all_own" on public.debts;
create policy "debts_all_own" on public.debts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- debt_payments
drop policy if exists "debt_payments_all_own" on public.debt_payments;
create policy "debt_payments_all_own" on public.debt_payments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- recurring_payments
drop policy if exists "recurring_all_own" on public.recurring_payments;
create policy "recurring_all_own" on public.recurring_payments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notifications
drop policy if exists "notifications_all_own" on public.notifications;
create policy "notifications_all_own" on public.notifications for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- subscriptions: o utilizador só pode LER — nunca alterar o próprio plano
-- diretamente (fica reservado para o backend/webhook de pagamento no futuro)
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid() = user_id);

-- concede a subscrição Free a utilizadores que já existiam antes desta tabela
insert into public.subscriptions (user_id, plan, status)
select id, 'free', 'active' from auth.users
on conflict (user_id) do nothing;

-- Expira automaticamente trials terminados (14 dias grátis). Só mexe em
-- subscrições "trialing" — nunca em quem já é cliente pagante ("active"),
-- para nunca cortar por engano o acesso de alguém que paga.
create or replace function public.expire_trials()
returns void
language sql
security definer
set search_path = public
as $$
  update public.subscriptions
  set plan = 'free', status = 'active'
  where status = 'trialing' and current_period_end < current_date;
$$;

select cron.unschedule('expire-trials-daily') where exists (
  select 1 from cron.job where jobname = 'expire-trials-daily'
);
select cron.schedule('expire-trials-daily', '0 3 * * *', 'select public.expire_trials();');

-- Lembretes de fim de trial por email (Resend, via Edge Function trial-reminder-cron)
create or replace function public.get_trialing_users_to_remind(days_before integer default 3)
returns table (user_id uuid, email text, full_name text, days_left integer)
language sql
security definer
set search_path = public
as $$
  select
    u.id as user_id,
    u.email,
    p.full_name,
    (s.current_period_end - current_date)::int as days_left
  from public.subscriptions s
  join auth.users u on u.id = s.user_id
  join public.profiles p on p.id = s.user_id
  where s.status = 'trialing'
    and s.trial_reminder_sent = false
    and s.current_period_end is not null
    and s.current_period_end <= current_date + days_before
    and s.current_period_end >= current_date;
$$;

revoke execute on function public.get_trialing_users_to_remind(integer) from public, anon, authenticated;
grant execute on function public.get_trialing_users_to_remind(integer) to service_role;

create or replace function public.mark_trial_reminders_sent(user_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.subscriptions set trial_reminder_sent = true where user_id = any(user_ids);
$$;

revoke execute on function public.mark_trial_reminders_sent(uuid[]) from public, anon, authenticated;
grant execute on function public.mark_trial_reminders_sent(uuid[]) to service_role;

-- ---------------------------------------------------------------------
-- EMAILS TRANSACIONAIS (boas-vindas + lembrete de fim de trial)
-- ---------------------------------------------------------------------
alter table public.subscriptions add column if not exists trial_reminder_sent boolean not null default false;

create extension if not exists pg_net with schema extensions;

-- Devolve os utilizadores em trial cujo prazo termina em breve e ainda não
-- receberam o lembrete. Só pode ser chamada pelo service_role (usada pela
-- Edge Function "trial-reminder-cron", nunca pelo browser).
create or replace function public.get_trialing_users_to_remind(days_before integer default 3)
returns table (user_id uuid, email text, full_name text, days_left integer)
language sql
security definer
set search_path = public
as $$
  select
    u.id as user_id,
    u.email,
    p.full_name,
    (s.current_period_end - current_date)::int as days_left
  from public.subscriptions s
  join auth.users u on u.id = s.user_id
  join public.profiles p on p.id = s.user_id
  where s.status = 'trialing'
    and s.trial_reminder_sent = false
    and s.current_period_end is not null
    and s.current_period_end <= current_date + days_before
    and s.current_period_end >= current_date;
$$;

revoke execute on function public.get_trialing_users_to_remind(integer) from public, anon, authenticated;
grant execute on function public.get_trialing_users_to_remind(integer) to service_role;

create or replace function public.mark_trial_reminders_sent(user_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.subscriptions set trial_reminder_sent = true where user_id = any(user_ids);
$$;

revoke execute on function public.mark_trial_reminders_sent(uuid[]) from public, anon, authenticated;
grant execute on function public.mark_trial_reminders_sent(uuid[]) to service_role;

-- O segredo partilhado entre o pg_cron e a Edge Function nunca fica em
-- texto simples na SQL — fica guardado encriptado no Supabase Vault.
-- Troca 'SUBSTITUI-PELO-TEU-SEGREDO' por um valor aleatório teu antes de
-- correres isto num projeto novo (ex: gera um UUID), e define o MESMO
-- valor como secret CRON_SECRET em Edge Functions > trial-reminder-cron.
select vault.create_secret(
  'SUBSTITUI-PELO-TEU-SEGREDO',
  'cron_secret_trial_reminder',
  'Segredo partilhado entre o pg_cron e a Edge Function trial-reminder-cron'
) where not exists (
  select 1 from vault.secrets where name = 'cron_secret_trial_reminder'
);

-- Chama a Edge Function "trial-reminder-cron" todos os dias ao meio-dia UTC.
-- Troca também o URL abaixo pelo do teu próprio projeto Supabase.
select cron.unschedule('trial-reminder-daily') where exists (
  select 1 from cron.job where jobname = 'trial-reminder-daily'
);
select cron.schedule(
  'trial-reminder-daily',
  '0 12 * * *',
  $cron$
  select net.http_post(
    url := 'https://SEU-PROJETO.supabase.co/functions/v1/trial-reminder-cron',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret_trial_reminder')
    )
  );
  $cron$
);

-- =====================================================================
-- VIEW: saldo por conta (initial_balance + receitas - despesas +/- transferências)
-- =====================================================================
create or replace view public.account_balances as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.initial_balance
    + coalesce(sum(case when t.type = 'receita' and t.account_id = a.id then t.amount else 0 end), 0)
    - coalesce(sum(case when t.type = 'despesa' and t.account_id = a.id then t.amount else 0 end), 0)
    - coalesce(sum(case when t.type = 'transferencia' and t.account_id = a.id then t.amount else 0 end), 0)
    + coalesce(sum(case when t.type = 'transferencia' and t.transfer_to_account_id = a.id then t.amount else 0 end), 0)
    as balance
from public.accounts a
left join public.transactions t
  on (t.account_id = a.id or t.transfer_to_account_id = a.id)
group by a.id, a.user_id, a.name, a.initial_balance;

alter view public.account_balances set (security_invoker = on);

-- =====================================================================
-- PAINEL ADMINISTRATIVO
-- =====================================================================
create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = check_user_id and role = 'admin');
$$;

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
    'signups_last_30_days', (select count(*) from public.profiles where created_at >= current_date - interval '30 days')
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_admin_metrics() to authenticated;

create or replace function public.get_admin_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  country text,
  currency text,
  plan text,
  status text,
  current_period_end date,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    u.id as user_id, u.email, p.full_name, p.country, p.currency,
    coalesce(s.plan, 'free') as plan, coalesce(s.status, 'active') as status,
    s.current_period_end, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.subscriptions s on s.user_id = p.id
  where public.is_admin(auth.uid())
  order by p.created_at desc;
$$;

grant execute on function public.get_admin_users() to authenticated;

-- Para te tornares administrador depois de te registares, corre manualmente:
-- update public.profiles set role = 'admin' where id = 'O-TEU-USER-ID-AQUI';

-- =====================================================================
-- PAGAMENTOS SEM RENOVAÇÃO AUTOMÁTICA (Angola / Okanda Pay)
-- =====================================================================
-- Expira Premium comprado sem renovação automática (pagamento único,
-- ex: Okanda Pay em Angola). NUNCA mexe em auto_renew = true (Cakto),
-- mesmo que current_period_end pareça ultrapassado — isso protege
-- clientes pagantes caso algum webhook de renovação atrase ou falhe.
create or replace function public.expire_non_renewing_premium()
returns void
language sql
security definer
set search_path = public
as $$
  update public.subscriptions
  set plan = 'free', status = 'active'
  where plan = 'premium'
    and auto_renew = false
    and status = 'active'
    and current_period_end is not null
    and current_period_end < current_date;
$$;

select cron.unschedule('expire-non-renewing-premium-daily') where exists (
  select 1 from cron.job where jobname = 'expire-non-renewing-premium-daily'
);
select cron.schedule('expire-non-renewing-premium-daily', '0 3 * * *', 'select public.expire_non_renewing_premium();');

-- =====================================================================
-- FIM DO SCHEMA
-- =====================================================================

-- =====================================================================
-- A partir daqui: conteúdo da migration 002_security_hardening.sql
-- (mantido aqui também para que colar apenas este ficheiro schema.sql
-- num projeto novo já fique com tudo — ver supabase/migrations/ para
-- aplicar isto de forma incremental num projeto já existente).
-- =====================================================================
-- =====================================================================
-- FinançasPro — Migration 002: Blindagem de segurança + RPCs em falta
-- Aplicar no SQL Editor do Supabase depois do schema.sql (idempotente:
-- pode ser corrido mais do que uma vez sem partir nada).
--
-- Resumo do que este ficheiro faz:
--   A. Impede um utilizador de alterar o próprio "role" (admin) por si
--   B. Adiciona colunas comerciais a "subscriptions" + estado "expired"
--   C. Cria "billing_events" (idempotência de webhooks)
--   D. Cria has_active_premium() — fonte de verdade única para Premium
--   E. Reforça RLS: liga ownership de FKs (account_id, category_id,
--      goal_id, debt_id, ...) e os LIMITES do plano Free diretamente na
--      base de dados — não só nas RPCs. Mesmo um pedido feito à mão via
--      REST (sem passar pelas RPCs) fica bloqueado.
--   F. Cria as RPCs que o frontend já chama e que não existiam:
--      create_account, create_goal, add_goal_contribution, create_debt,
--      register_debt_payment, create_recurring_payment,
--      mark_recurring_payment_paid, transfer_between_accounts,
--      upsert_budget, get_user_id_by_email
-- =====================================================================

-- ---------------------------------------------------------------------
-- A. profiles: impedir auto-promoção a admin
-- ---------------------------------------------------------------------
-- A policy "profiles_update_own" permite ao utilizador atualizar a
-- própria linha (para editar nome, moeda, tema, etc.), mas o Postgres
-- RLS não restringe COLUNAS — sem isto, o próprio utilizador podia
-- fazer `update profiles set role = 'admin' where id = auth.uid()`.
-- Este trigger reverte qualquer alteração ao "role" que não venha do
-- service_role (Edge Functions/admin) ou de uma sessão SQL manual no
-- dashboard (auth.role() aí não é 'authenticated').
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.role() = 'authenticated' then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ---------------------------------------------------------------------
-- B. subscriptions: colunas comerciais em falta + estado "expired"
-- ---------------------------------------------------------------------
alter table public.subscriptions add column if not exists country text;
alter table public.subscriptions add column if not exists currency text check (currency in ('AOA', 'BRL'));
alter table public.subscriptions add column if not exists provider_customer_id text;
alter table public.subscriptions add column if not exists provider_subscription_id text;
alter table public.subscriptions add column if not exists provider_product_id text;
alter table public.subscriptions add column if not exists current_period_start date;
alter table public.subscriptions add column if not exists canceled_at timestamptz;

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('active', 'canceled', 'past_due', 'trialing', 'expired'));

comment on column public.subscriptions.status is
  'active=pago em dia | trialing=teste 14 dias | past_due=pagamento falhou | canceled=cancelado (mantém Premium até current_period_end) | expired=terminado, sem acesso Premium';

-- ---------------------------------------------------------------------
-- C. billing_events — idempotência de webhooks (Cakto/Okanda)
-- ---------------------------------------------------------------------
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('cakto', 'okanda')),
  event_id text not null,
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index if not exists idx_billing_events_user on public.billing_events(user_id);
create index if not exists idx_billing_events_processed on public.billing_events(processed);

alter table public.billing_events enable row level security;
-- Sem nenhuma policy para anon/authenticated: ninguém no browser lê ou
-- escreve billing_events — só o service_role (que ignora RLS), usado
-- pelas Edge Functions de billing.

-- ---------------------------------------------------------------------
-- D. has_active_premium() — fonte de verdade única do acesso Premium
-- ---------------------------------------------------------------------
-- Considera Premium válido quando:
--  * status active/trialing e ainda dentro do período (ou sem data-fim)
--  * status canceled MAS ainda dentro do período já pago (current_period_end)
-- NUNCA considera past_due ou expired como Premium.
create or replace function public.has_active_premium(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user_id
      and s.plan = 'premium'
      and (
        (s.status in ('active', 'trialing') and (s.current_period_end is null or s.current_period_end >= current_date))
        or (s.status = 'canceled' and s.current_period_end is not null and s.current_period_end >= current_date)
      )
  );
$$;

grant execute on function public.has_active_premium(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- E. RLS reforçado — ownership de FKs + limites do plano Free
-- ---------------------------------------------------------------------

-- categories: parent_id tem de pertencer ao próprio utilizador
drop policy if exists "categories_all_own" on public.categories;
drop policy if exists "categories_select_own" on public.categories;
drop policy if exists "categories_insert_own" on public.categories;
drop policy if exists "categories_update_own" on public.categories;
drop policy if exists "categories_delete_own" on public.categories;

create policy "categories_select_own" on public.categories for select
  using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert
  with check (
    auth.uid() = user_id
    and (parent_id is null or exists (select 1 from public.categories pc where pc.id = parent_id and pc.user_id = auth.uid()))
  );
create policy "categories_update_own" on public.categories for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (parent_id is null or exists (select 1 from public.categories pc where pc.id = parent_id and pc.user_id = auth.uid()))
  );
create policy "categories_delete_own" on public.categories for delete
  using (auth.uid() = user_id);

-- accounts: sem FK para outras tabelas, mas com limite Free (2)
drop policy if exists "accounts_all_own" on public.accounts;
drop policy if exists "accounts_select_own" on public.accounts;
drop policy if exists "accounts_insert_own" on public.accounts;
drop policy if exists "accounts_update_own" on public.accounts;
drop policy if exists "accounts_delete_own" on public.accounts;

create policy "accounts_select_own" on public.accounts for select
  using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts for insert
  with check (
    auth.uid() = user_id
    and (
      public.has_active_premium(auth.uid())
      or (select count(*) from public.accounts a where a.user_id = auth.uid() and a.archived = false) < 2
    )
  );
create policy "accounts_update_own" on public.accounts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "accounts_delete_own" on public.accounts for delete
  using (auth.uid() = user_id);

-- transactions: account_id / category_id / transfer_to_account_id têm de
-- pertencer ao próprio utilizador (é aqui que estava o maior risco: um
-- utilizador podia associar uma transação sua à conta de outra pessoa)
drop policy if exists "transactions_all_own" on public.transactions;
drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;

create policy "transactions_select_own" on public.transactions for select
  using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid()))
    and (transfer_to_account_id is null or exists (select 1 from public.accounts a2 where a2.id = transfer_to_account_id and a2.user_id = auth.uid()))
  );
create policy "transactions_update_own" on public.transactions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid())
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid()))
    and (transfer_to_account_id is null or exists (select 1 from public.accounts a2 where a2.id = transfer_to_account_id and a2.user_id = auth.uid()))
  );
create policy "transactions_delete_own" on public.transactions for delete
  using (auth.uid() = user_id);

-- budgets: category_id do próprio utilizador + limite Free (5/mês, só
-- conta categorias novas nesse mês — editar um orçamento existente nunca bloqueia)
drop policy if exists "budgets_all_own" on public.budgets;
drop policy if exists "budgets_select_own" on public.budgets;
drop policy if exists "budgets_insert_own" on public.budgets;
drop policy if exists "budgets_update_own" on public.budgets;
drop policy if exists "budgets_delete_own" on public.budgets;

create policy "budgets_select_own" on public.budgets for select
  using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid())
    and (
      public.has_active_premium(auth.uid())
      or exists (select 1 from public.budgets b where b.user_id = auth.uid() and b.category_id = category_id and b.month = month and b.year = year)
      or (select count(*) from public.budgets b where b.user_id = auth.uid() and b.month = month and b.year = year) < 5
    )
  );
create policy "budgets_update_own" on public.budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid()));
create policy "budgets_delete_own" on public.budgets for delete
  using (auth.uid() = user_id);

-- goals: limite Free (2 ativas — status 'em_progresso')
drop policy if exists "goals_all_own" on public.goals;
drop policy if exists "goals_select_own" on public.goals;
drop policy if exists "goals_insert_own" on public.goals;
drop policy if exists "goals_update_own" on public.goals;
drop policy if exists "goals_delete_own" on public.goals;

create policy "goals_select_own" on public.goals for select
  using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals for insert
  with check (
    auth.uid() = user_id
    and (
      public.has_active_premium(auth.uid())
      or status <> 'em_progresso'
      or (select count(*) from public.goals g where g.user_id = auth.uid() and g.status = 'em_progresso') < 2
    )
  );
create policy "goals_update_own" on public.goals for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_delete_own" on public.goals for delete
  using (auth.uid() = user_id);

-- goal_contributions: goal_id do próprio utilizador
drop policy if exists "goal_contributions_all_own" on public.goal_contributions;
drop policy if exists "goal_contributions_select_own" on public.goal_contributions;
drop policy if exists "goal_contributions_insert_own" on public.goal_contributions;
drop policy if exists "goal_contributions_update_own" on public.goal_contributions;
drop policy if exists "goal_contributions_delete_own" on public.goal_contributions;

create policy "goal_contributions_select_own" on public.goal_contributions for select
  using (auth.uid() = user_id);
create policy "goal_contributions_insert_own" on public.goal_contributions for insert
  with check (auth.uid() = user_id and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid()));
create policy "goal_contributions_update_own" on public.goal_contributions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goal_contributions_delete_own" on public.goal_contributions for delete
  using (auth.uid() = user_id);

-- debts: limite Free (2 ativas — status 'ativa')
drop policy if exists "debts_all_own" on public.debts;
drop policy if exists "debts_select_own" on public.debts;
drop policy if exists "debts_insert_own" on public.debts;
drop policy if exists "debts_update_own" on public.debts;
drop policy if exists "debts_delete_own" on public.debts;

create policy "debts_select_own" on public.debts for select
  using (auth.uid() = user_id);
create policy "debts_insert_own" on public.debts for insert
  with check (
    auth.uid() = user_id
    and (
      public.has_active_premium(auth.uid())
      or status <> 'ativa'
      or (select count(*) from public.debts d where d.user_id = auth.uid() and d.status = 'ativa') < 2
    )
  );
create policy "debts_update_own" on public.debts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "debts_delete_own" on public.debts for delete
  using (auth.uid() = user_id);

-- debt_payments: debt_id do próprio utilizador
drop policy if exists "debt_payments_all_own" on public.debt_payments;
drop policy if exists "debt_payments_select_own" on public.debt_payments;
drop policy if exists "debt_payments_insert_own" on public.debt_payments;
drop policy if exists "debt_payments_update_own" on public.debt_payments;
drop policy if exists "debt_payments_delete_own" on public.debt_payments;

create policy "debt_payments_select_own" on public.debt_payments for select
  using (auth.uid() = user_id);
create policy "debt_payments_insert_own" on public.debt_payments for insert
  with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.id = debt_id and d.user_id = auth.uid()));
create policy "debt_payments_update_own" on public.debt_payments for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "debt_payments_delete_own" on public.debt_payments for delete
  using (auth.uid() = user_id);

-- recurring_payments: category_id/account_id do próprio utilizador +
-- limite Free (3 ativos)
drop policy if exists "recurring_all_own" on public.recurring_payments;
drop policy if exists "recurring_select_own" on public.recurring_payments;
drop policy if exists "recurring_insert_own" on public.recurring_payments;
drop policy if exists "recurring_update_own" on public.recurring_payments;
drop policy if exists "recurring_delete_own" on public.recurring_payments;

create policy "recurring_select_own" on public.recurring_payments for select
  using (auth.uid() = user_id);
create policy "recurring_insert_own" on public.recurring_payments for insert
  with check (
    auth.uid() = user_id
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid()))
    and (account_id is null or exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid()))
    and (
      public.has_active_premium(auth.uid())
      or active = false
      or (select count(*) from public.recurring_payments r where r.user_id = auth.uid() and r.active = true) < 3
    )
  );
create policy "recurring_update_own" on public.recurring_payments for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid()))
    and (account_id is null or exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid()))
  );
create policy "recurring_delete_own" on public.recurring_payments for delete
  using (auth.uid() = user_id);

-- notifications: sem FK para outras tabelas — mantém "for all" simples
drop policy if exists "notifications_all_own" on public.notifications;
create policy "notifications_all_own" on public.notifications for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- F. RPCs que o frontend já chama e ainda não existiam
-- ---------------------------------------------------------------------

-- create_account -------------------------------------------------------
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
    select count(*) into v_count from public.accounts where user_id = v_uid and archived = false;
    if v_count >= 2 then raise exception 'LIMIT_REACHED'; end if;
  end if;

  insert into public.accounts (user_id, name, type, initial_balance, color, icon)
  values (v_uid, p_name, p_type, coalesce(p_initial_balance, 0), p_color, p_icon)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_account(text, public.account_type, numeric, text, text) from public, anon;
grant execute on function public.create_account(text, public.account_type, numeric, text, text) to authenticated;

-- create_goal ------------------------------------------------------------
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
    select count(*) into v_count from public.goals where user_id = v_uid and status = 'em_progresso';
    if v_count >= 2 then raise exception 'LIMIT_REACHED'; end if;
  end if;

  insert into public.goals (user_id, name, target_amount, deadline, color, icon)
  values (v_uid, p_name, p_target_amount, p_deadline, p_color, p_icon)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_goal(text, numeric, date, text, text) from public, anon;
grant execute on function public.create_goal(text, numeric, date, text, text) to authenticated;

-- add_goal_contribution ---------------------------------------------------
create or replace function public.add_goal_contribution(
  p_goal_id uuid,
  p_amount numeric,
  p_date date default current_date,
  p_notes text default ''
)
returns public.goal_contributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_goal public.goals;
  v_row public.goal_contributions;
begin
  if v_uid is null then raise exception 'UNAUTHORIZED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  select * into v_goal from public.goals where id = p_goal_id and user_id = v_uid for update;
  if not found then raise exception 'GOAL_NOT_FOUND'; end if;

  insert into public.goal_contributions (user_id, goal_id, amount, date, notes)
  values (v_uid, p_goal_id, p_amount, coalesce(p_date, current_date), coalesce(p_notes, ''))
  returning * into v_row;

  update public.goals
    set current_amount = current_amount + p_amount,
        status = case when current_amount + p_amount >= target_amount then 'concluida' else status end
    where id = p_goal_id;

  return v_row;
end;
$$;

revoke all on function public.add_goal_contribution(uuid, numeric, date, text) from public, anon;
grant execute on function public.add_goal_contribution(uuid, numeric, date, text) to authenticated;

-- create_debt --------------------------------------------------------------
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
    select count(*) into v_count from public.debts where user_id = v_uid and status = 'ativa';
    if v_count >= 2 then raise exception 'LIMIT_REACHED'; end if;
  end if;

  insert into public.debts (user_id, name, creditor, total_amount, installment_amount, due_date, interest_rate, notes)
  values (v_uid, p_name, coalesce(p_creditor, ''), p_total_amount, coalesce(p_installment_amount, 0), p_due_date, coalesce(p_interest_rate, 0), coalesce(p_notes, ''))
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_debt(text, text, numeric, numeric, date, numeric, text) from public, anon;
grant execute on function public.create_debt(text, text, numeric, numeric, date, numeric, text) to authenticated;

-- register_debt_payment -----------------------------------------------------
create or replace function public.register_debt_payment(
  p_debt_id uuid,
  p_amount numeric,
  p_date date default current_date
)
returns public.debt_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_debt public.debts;
  v_row public.debt_payments;
begin
  if v_uid is null then raise exception 'UNAUTHORIZED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  select * into v_debt from public.debts where id = p_debt_id and user_id = v_uid for update;
  if not found then raise exception 'DEBT_NOT_FOUND'; end if;

  insert into public.debt_payments (user_id, debt_id, amount, date)
  values (v_uid, p_debt_id, p_amount, coalesce(p_date, current_date))
  returning * into v_row;

  update public.debts
    set paid_amount = paid_amount + p_amount,
        status = case when paid_amount + p_amount >= total_amount then 'quitada' else status end
    where id = p_debt_id;

  return v_row;
end;
$$;

revoke all on function public.register_debt_payment(uuid, numeric, date) from public, anon;
grant execute on function public.register_debt_payment(uuid, numeric, date) to authenticated;

-- create_recurring_payment --------------------------------------------------
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
    select count(*) into v_count from public.recurring_payments where user_id = v_uid and active = true;
    if v_count >= 3 then raise exception 'LIMIT_REACHED'; end if;
  end if;

  insert into public.recurring_payments (user_id, name, amount, type, frequency, next_due_date, category_id, account_id)
  values (v_uid, p_name, p_amount, p_type, p_frequency, p_next_due_date, p_category_id, p_account_id)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_recurring_payment(text, numeric, public.transaction_type, public.recurrence_frequency, date, uuid, uuid) from public, anon;
grant execute on function public.create_recurring_payment(text, numeric, public.transaction_type, public.recurrence_frequency, date, uuid, uuid) to authenticated;

-- mark_recurring_payment_paid ------------------------------------------------
-- Índice único que impede duplo-clique de criar duas transações para o
-- mesmo pagamento recorrente na mesma data de vencimento.
create unique index if not exists idx_unique_recurring_transaction
  on public.transactions(recurring_payment_id, date)
  where recurring_payment_id is not null;

create or replace function public.mark_recurring_payment_paid(
  p_recurring_id uuid
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rec public.recurring_payments;
  v_tx public.transactions;
  v_next date;
begin
  if v_uid is null then raise exception 'UNAUTHORIZED'; end if;

  select * into v_rec from public.recurring_payments where id = p_recurring_id and user_id = v_uid for update;
  if not found then raise exception 'RECURRING_NOT_FOUND'; end if;

  if v_rec.account_id is null then raise exception 'ACCOUNT_NOT_FOUND'; end if;

  begin
    insert into public.transactions (user_id, type, description, amount, category_id, account_id, date, is_recurring, recurring_payment_id)
    values (v_uid, v_rec.type, v_rec.name, v_rec.amount, v_rec.category_id, v_rec.account_id, v_rec.next_due_date, true, p_recurring_id)
    returning * into v_tx;
  exception when unique_violation then
    raise exception 'DUPLICATE_OPERATION';
  end;

  v_next := case v_rec.frequency
    when 'semanal' then v_rec.next_due_date + interval '7 days'
    when 'quinzenal' then v_rec.next_due_date + interval '14 days'
    when 'mensal' then v_rec.next_due_date + interval '1 month'
    when 'anual' then v_rec.next_due_date + interval '1 year'
    else v_rec.next_due_date + interval '1 month'
  end;

  update public.recurring_payments set next_due_date = v_next::date where id = p_recurring_id;

  return v_tx;
end;
$$;

revoke all on function public.mark_recurring_payment_paid(uuid) from public, anon;
grant execute on function public.mark_recurring_payment_paid(uuid) to authenticated;

-- transfer_between_accounts --------------------------------------------------
create or replace function public.transfer_between_accounts(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_date date default current_date,
  p_description text default 'Transferência'
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_from public.accounts;
  v_to public.accounts;
  v_row public.transactions;
begin
  if v_uid is null then raise exception 'UNAUTHORIZED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_from_account_id = p_to_account_id then raise exception 'SAME_ACCOUNT_TRANSFER'; end if;

  -- Bloqueia as duas contas sempre pela mesma ordem (id) para nunca
  -- criar deadlock com uma transferência simultânea no sentido inverso.
  if p_from_account_id < p_to_account_id then
    select * into v_from from public.accounts where id = p_from_account_id and user_id = v_uid for update;
    select * into v_to from public.accounts where id = p_to_account_id and user_id = v_uid for update;
  else
    select * into v_to from public.accounts where id = p_to_account_id and user_id = v_uid for update;
    select * into v_from from public.accounts where id = p_from_account_id and user_id = v_uid for update;
  end if;

  if v_from.id is null or v_to.id is null then raise exception 'ACCOUNT_NOT_FOUND'; end if;

  insert into public.transactions (user_id, type, description, amount, account_id, transfer_to_account_id, date)
  values (v_uid, 'transferencia', coalesce(p_description, 'Transferência'), p_amount, p_from_account_id, p_to_account_id, coalesce(p_date, current_date))
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.transfer_between_accounts(uuid, uuid, numeric, date, text) from public, anon;
grant execute on function public.transfer_between_accounts(uuid, uuid, numeric, date, text) to authenticated;

-- upsert_budget ----------------------------------------------------------
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

revoke all on function public.upsert_budget(uuid, numeric, smallint, smallint) from public, anon;
grant execute on function public.upsert_budget(uuid, numeric, smallint, smallint) to authenticated;

-- get_user_id_by_email ----------------------------------------------------
-- Usada apenas pela Edge Function cakto-webhook (via service_role) para
-- encontrar o utilizador FinançasPro a partir do email do pagamento.
-- NUNCA deve ficar acessível a anon/authenticated — devolveria o
-- user_id de qualquer email a quem o pedisse.
create or replace function public.get_user_id_by_email(user_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from auth.users where lower(email) = lower(user_email) limit 1;
$$;

revoke execute on function public.get_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.get_user_id_by_email(text) to service_role;

-- =====================================================================
-- FIM DA MIGRATION 002
-- =====================================================================
