import { Users, Crown, Clock, TrendingUp, AlertTriangle, UserPlus } from 'lucide-react';
import { useAdminMetrics, useAdminUsers } from '../hooks/useAdmin';
import { StatCard } from '../components/ui/StatCard';
import { Spinner, EmptyState } from '../components/ui/Feedback';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  premium: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  trialing: 'Trial',
  canceled: 'Cancelado',
  past_due: 'Pagamento em falta',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
  trialing: 'bg-gold-500/15 text-gold-600 dark:text-gold-400',
  canceled: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  past_due: 'bg-coral-500/15 text-coral-600 dark:text-coral-400',
};

export default function Admin() {
  const { data: metrics, isLoading: loadingMetrics } = useAdminMetrics();
  const { data: users = [], isLoading: loadingUsers } = useAdminUsers();

  if (loadingMetrics || loadingUsers) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Painel administrativo</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Visão geral dos utilizadores e planos do FinançasPro.</p>
      </div>

      {metrics && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Utilizadores totais" value={String(metrics.total_users)} icon={Users} />
          <StatCard
            label="Novos (últimos 30 dias)"
            value={String(metrics.signups_last_30_days)}
            icon={UserPlus}
            iconClass="bg-gold-500/15 text-gold-600 dark:text-gold-400"
          />
          <StatCard
            label="Premium ativo (pagante)"
            value={String(metrics.premium_active_users)}
            icon={Crown}
            iconClass="bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
          />
          <StatCard
            label="Em trial"
            value={String(metrics.trialing_users)}
            icon={Clock}
            iconClass="bg-gold-500/15 text-gold-600 dark:text-gold-400"
          />
          <StatCard label="No plano Free" value={String(metrics.free_users)} icon={TrendingUp} />
          <StatCard
            label="Pagamento em falta"
            value={String(metrics.past_due_users)}
            icon={AlertTriangle}
            iconClass="bg-coral-500/15 text-coral-600 dark:text-coral-400"
          />
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 dark:border-ink-800">
          <h2 className="font-display font-semibold text-ink-900 dark:text-white">Utilizadores</h2>
        </div>

        {users.length === 0 ? (
          <EmptyState icon={Users} title="Sem utilizadores" description="Ainda não há nenhum utilizador registado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-400 border-b border-ink-100 dark:border-ink-800">
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">País</th>
                  <th className="px-5 py-3 font-medium">Plano</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium">Registado em</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} className="border-b border-ink-50 dark:border-ink-800/60 last:border-0">
                    <td className="px-5 py-3 font-medium text-ink-900 dark:text-white whitespace-nowrap">
                      {u.full_name || '—'}
                    </td>
                    <td className="px-5 py-3 text-ink-500 dark:text-ink-400 whitespace-nowrap">{u.email}</td>
                    <td className="px-5 py-3 text-ink-500 dark:text-ink-400">{u.country}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${PLAN_BADGE[u.plan] ?? PLAN_BADGE.free}`}>
                        {u.plan === 'premium' ? 'Premium' : 'Free'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge ${STATUS_BADGE[u.status] ?? STATUS_BADGE.active}`}>
                        {STATUS_LABEL[u.status] ?? u.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink-500 dark:text-ink-400 whitespace-nowrap">
                      {format(parseISO(u.created_at), "d 'de' MMM, yyyy", { locale: pt })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
