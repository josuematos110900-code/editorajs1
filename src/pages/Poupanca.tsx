import { useMemo } from 'react';
import { Coins, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useGoals, useGoalContributions } from '../hooks/useGoals';
import { useProfile } from '../context/ProfileContext';
import { formatCurrency } from '../lib/currency';
import { EmptyState, ProgressBar } from '../components/ui/Feedback';
import { calculateGoalProgress } from '../lib/finance';
import { format, parseISO, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function Poupanca() {
  const { profile } = useProfile();
  const { data: goals = [] } = useGoals();
  const { data: contributions = [], isLoading } = useGoalContributions();

  const totalSaved = contributions.reduce((acc, c) => acc + Number(c.amount), 0);

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
    return months.map((d) => {
      const total = contributions
        .filter((c) => {
          const date = parseISO(c.date);
          return date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth();
        })
        .reduce((acc, c) => acc + Number(c.amount), 0);
      return { mes: format(d, 'MMM', { locale: pt }), total };
    });
  }, [contributions]);

  const thisMonth = new Date();
  const savedThisMonth = contributions
    .filter((c) => {
      const d = parseISO(c.date);
      return d.getFullYear() === thisMonth.getFullYear() && d.getMonth() === thisMonth.getMonth();
    })
    .reduce((acc, c) => acc + Number(c.amount), 0);

  const goalById = (id: string) => goals.find((g) => g.id === id);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Poupança</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Acompanha a tua poupança acumulada e a evolução mês a mês.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-sm text-ink-500 dark:text-ink-400">Poupança acumulada</p>
          <p className="font-display text-3xl font-bold text-ink-900 dark:text-white mt-1.5 tabular-nums">
            {formatCurrency(totalSaved, profile?.currency)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-ink-500 dark:text-ink-400">Poupança este mês</p>
          <p className="font-display text-3xl font-bold text-brand-600 dark:text-brand-400 mt-1.5 tabular-nums">
            {formatCurrency(savedThisMonth, profile?.currency)}
          </p>
          {profile && profile.monthly_income > 0 && (
            <p className="text-xs text-ink-400 mt-1">
              Objetivo: {profile.savings_target_percent}% do rendimento ({formatCurrency((profile.monthly_income * profile.savings_target_percent) / 100, profile.currency)})
            </p>
          )}
        </div>
      </div>

      <div className="card p-5">
        <p className="font-display font-semibold text-ink-900 dark:text-white mb-4">Evolução da poupança (6 meses)</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-ink-100 dark:stroke-ink-800" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="currentColor" className="text-ink-400" />
            <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-ink-400" width={80} tickFormatter={(v) => formatCurrency(v, profile?.currency).split(',')[0]} />
            <Tooltip formatter={(value) => formatCurrency(Number(value), profile?.currency)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
            <Bar dataKey="total" fill="#17A48C" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="font-display font-semibold text-ink-900 dark:text-white mb-3">Poupança por meta</p>
        {goals.length === 0 ? (
          <EmptyState icon={Coins} title="Sem metas associadas" description="Cria metas para organizares a tua poupança por objetivo." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const progress = calculateGoalProgress(goal);
              return (
                <div key={goal.id} className="card p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: goal.color }}>
                      <TrendingUp size={15} />
                    </div>
                    <p className="font-medium text-sm text-ink-900 dark:text-white">{goal.name}</p>
                  </div>
                  <ProgressBar percent={progress.percentComplete} />
                  <div className="flex justify-between text-xs mt-2 text-ink-500 dark:text-ink-400">
                    <span>{formatCurrency(goal.current_amount, profile?.currency)}</span>
                    <span>{progress.percentComplete}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <p className="font-display font-semibold text-ink-900 dark:text-white mb-3">Histórico de contribuições</p>
        <div className="card divide-y divide-ink-50 dark:divide-ink-800">
          {isLoading ? (
            <p className="text-center text-ink-400 text-sm py-8">A carregar…</p>
          ) : contributions.length === 0 ? (
            <EmptyState icon={Coins} title="Sem contribuições ainda" description='Adiciona poupança às tuas metas na página "Metas".' />
          ) : (
            contributions.slice(0, 15).map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-900 dark:text-white">{goalById(c.goal_id)?.name ?? 'Meta'}</p>
                  <p className="text-xs text-ink-400">{format(parseISO(c.date), "d 'de' MMM 'de' yyyy", { locale: pt })}</p>
                </div>
                <span className="font-display font-semibold text-brand-600 dark:text-brand-400 tabular-nums">
                  +{formatCurrency(Number(c.amount), profile?.currency)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
