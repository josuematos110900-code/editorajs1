import type { PlanType } from '../types/database';

/**
 * Limites do plano Free — usados aqui só para MOSTRAR o uso atual na UI
 * (Configurações > Plano). A aplicação real do limite acontece no servidor,
 * nas RPCs create_account/create_goal/create_debt/create_recurring_payment/
 * upsert_budget (ver supabase/schema.sql) — nunca confies apenas nestes
 * valores no cliente para bloquear nada.
 */
export const PLAN_LIMITS: Record<PlanType, Record<PlanResource, number>> = {
  free: {
    accounts: 2,
    goals: 2,
    debts: 2,
    budgets: 5,
    recurring: 3,
  },
  premium: {
    accounts: Infinity,
    goals: Infinity,
    debts: Infinity,
    budgets: Infinity,
    recurring: Infinity,
  },
};

export type PlanResource = 'accounts' | 'goals' | 'debts' | 'budgets' | 'recurring';

const RESOURCE_LABELS: Record<PlanResource, string> = {
  accounts: 'contas',
  goals: 'metas ativas',
  debts: 'dívidas',
  budgets: 'orçamentos',
  recurring: 'pagamentos recorrentes',
};

export function getResourceLabel(resource: PlanResource): string {
  return RESOURCE_LABELS[resource];
}
