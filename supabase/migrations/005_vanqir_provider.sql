-- =====================================================================
-- FinançasPro — Migration 005: fornecedor de pagamento de Angola é o
-- Vanqir Pay (não "Okanda" como estava provisoriamente nomeado antes de
-- termos o link real). Aplicar depois de 004_race_conditions.sql
-- (idempotente).
--
-- Só alarga os valores aceites nas constraints — nunca remove 'okanda'
-- (não apaga nada que possa já ter sido gravado com esse nome).
-- =====================================================================

alter table public.subscriptions drop constraint if exists subscriptions_billing_provider_check;
alter table public.subscriptions add constraint subscriptions_billing_provider_check
  check (billing_provider in ('cakto', 'okanda', 'vanqir'));

alter table public.billing_events drop constraint if exists billing_events_provider_check;
alter table public.billing_events add constraint billing_events_provider_check
  check (provider in ('cakto', 'okanda', 'vanqir'));
