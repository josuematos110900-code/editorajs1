import type { Subscription } from '../types/database';

/**
 * Espelha no frontend a função has_active_premium() do Postgres
 * (ver supabase/migrations/002_security_hardening.sql) — usar APENAS
 * para decisões de UI (mostrar/esconder botões, barras de progresso,
 * paywall). A aplicação real dos limites e do acesso Premium acontece
 * sempre no servidor, nas RLS/RPCs — nunca confiar só nisto para
 * bloquear algo.
 */
export function hasActivePremium(subscription: Subscription | null | undefined): boolean {
  if (!subscription || subscription.plan !== 'premium') return false;

  const periodEnd = subscription.current_period_end;
  const stillInPeriod = !periodEnd || periodEnd >= new Date().toISOString().slice(0, 10);

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return stillInPeriod;
  }

  // Cancelado mas ainda dentro do período já pago: continua Premium até lá.
  if (subscription.status === 'canceled') {
    return !!periodEnd && stillInPeriod;
  }

  // past_due / expired nunca contam como Premium ativo.
  return false;
}
