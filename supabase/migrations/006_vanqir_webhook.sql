-- =====================================================================
-- FinançasPro — Migration 006: alinhar a expiração do Premium sem
-- renovação automática (Angola/Vanqir, pagamento único de 30 dias) com
-- o estado "expired" já usado pela Cakto/renovação automática — para a
-- página /assinatura mostrar sempre a mesma mensagem clara ("O teu
-- Premium terminou. Os teus dados continuam guardados.") em vez de o
-- utilizador só ver "Free" sem explicação.
-- Aplicar depois de 005_vanqir_provider.sql (idempotente).
-- =====================================================================

create or replace function public.expire_non_renewing_premium()
returns void
language sql
security definer
set search_path = public
as $$
  update public.subscriptions
  set plan = 'free', status = 'expired'
  where plan = 'premium'
    and auto_renew = false
    and status = 'active'
    and current_period_end is not null
    and current_period_end < current_date;
$$;
