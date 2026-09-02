import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { getResourceLabel, PLAN_LIMITS, type PlanResource } from '../../lib/planLimits';

interface PaywallProps {
  resource: PlanResource;
  current: number;
}

/**
 * FASE 8 — Paywall profissional, mostrado sempre que uma RPC devolve
 * LIMIT_REACHED (ver rpcErrors.ts) para um recurso limitado no Free.
 * Nunca esconde o motivo nem usa "Erro desconhecido" — diz exatamente
 * qual o limite e onde fazer upgrade.
 */
export function Paywall({ resource, current }: PaywallProps) {
  const limit = PLAN_LIMITS.free[resource];
  const label = getResourceLabel(resource);
  return (
    <div className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3.5 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gold-700 dark:text-gold-400">
        <Crown size={16} className="shrink-0" />
        Chegaste ao limite do plano Free
      </div>
      <p className="text-sm text-ink-600 dark:text-ink-300">
        {label.charAt(0).toUpperCase() + label.slice(1)}: {current}/{limit}. Com o Premium tens {label} ilimitadas.
      </p>
      <Link to="/assinatura" className="btn-primary inline-flex text-xs py-1.5 px-3">
        Conhecer Premium
      </Link>
    </div>
  );
}

/** Deteta se uma mensagem de erro já traduzida (rpcErrors.ts) é de limite atingido. */
export function isLimitReachedMessage(message: string | null | undefined): boolean {
  return !!message && message.startsWith('Limite de');
}
