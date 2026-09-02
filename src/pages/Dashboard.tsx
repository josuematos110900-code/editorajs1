import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, TrendingUp, PiggyBank, Target, Zap,
  ArrowUpCircle, ArrowDownCircle, AlertTriangle, Info, CheckCircle2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  XAxis, YAxis, CartesianGrid, LineChart, Line,
} from 'recharts';
import { useProfile } from '../context/ProfileContext';
import { useAccountBalances } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useBudgets } from '../hooks/useBudgets';
import { useGoals } from '../hooks/useGoals';
import { useRecurringPayments } from '../hooks/useRecurring';
import { useDebts } from '../hooks/useDebts';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState, ProgressBar } from '../components/ui/Feedback';
import { formatCurrency } from '../lib/currency';
import {
  filterByMonth, sumByType, calculateDailyBudget, calculateAllocation,
  getSalaryDistributionDefaults, groupExpensesByCategory, sumRecurringDueThisMonth,
  getUpcomingRecurring, calculateGoalProgress, comparePeriods, getMonthSummary,
} from '../lib/finance';
import { generateLiveAlerts } from '../lib/alerts';
import { format, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';

const PIE_COLORS = ['#17A48C', '#D4A017', '#3B82F6', '#8B5CF6', '#E85D5D', '#3FC0A6', '#F3D584', '#EC4899', '#64748B'];

const ALERT_ICON = { info: Info, atencao: AlertTriangle, critico: AlertTriangle };
const ALERT_STYLE = {
  info: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-800',
  atencao: 'bg-gold-500/10 text-gold-600 border-gold-500/30 dark:text-gold-400',
  critico: 'bg-coral-500/10 text-coral-600 border-coral-500/30 dark:text-coral-400',
};

export default function Dashboard() {
  const { profile } = useProfile();
  const currency = profile?.currency ?? 'AOA';
  // Memorizado para a duração do componente montado — evita recalcular todos os
  // useMemo dependentes de "hoje" a cada re-render (ex: mudança de tema, toasts).
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const { data: balances = [] } = useAccountBalances();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: budgets = [] } = useBudgets(year, month);
  const { data: goals = [] } = useGoals();
  const { data: recurringPayments = [] } = useRecurringPayments();
  const { data: debts = [] } = useDebts();

  const totalBalance = balances.reduce((acc, b) => acc + Number(b.balance), 0);

  const monthTx = useMemo(() => filterByMonth(transactions, year, month), [transactions, year, month]);
  const prevMonthDate = subMonths(today, 1);
  const prevMonthTx = useMemo(
    () => filterByMonth(transactions, prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1),
    [transactions, prevMonthDate]
  );

  const receitas = sumByType(monthTx, 'receita');
  const despesas = sumByType(monthTx, 'despesa');
  const saldoMes = receitas - despesas;

  const currentSummary = getMonthSummary(transactions, year, month);
  const previousSummary = getMonthSummary(transactions, prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1);
  const comparison = comparePeriods(currentSummary, previousSummary);

  const income = profile?.monthly_income ?? 0;
  const allocation = profile
    ? calculateAllocation(income, getSalaryDistributionDefaults(profile))
    : null;

  const recurringDue = sumRecurringDueThisMonth(recurringPayments, today);
  const dailyBudget = calculateDailyBudget({
    monthlyIncome: income || receitas,
    expensesSoFar: despesas,
    upcomingRecurringThisMonth: recurringDue,
    goalContributionsThisMonth: 0,
    today,
  });

  const categoryNameById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  );
  const expensesByCategory = useMemo(
    () => groupExpensesByCategory(monthTx, categoryNameById),
    [monthTx, categoryNameById]
  );

  const upcoming = getUpcomingRecurring(recurringPayments, 14, today);

  const activeGoals = goals.filter((g) => g.status === 'em_progresso').slice(0, 3);
  const activeDebts = debts.filter((d) => d.status === 'ativa');
  const totalDebtRemaining = activeDebts.reduce((acc, d) => acc + (Number(d.total_amount) - Number(d.paid_amount)), 0);

  const alerts = generateLiveAlerts({
    transactions: monthTx,
    previousMonthTransactions: prevMonthTx,
    budgets,
    categories,
    goals,
    recurringPayments,
    currency,
  }).slice(0, 4);

  // Evolução do saldo — últimos 6 meses
  const evolutionData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(today, 5 - i));
    return months.map((d) => {
      const summary = getMonthSummary(transactions, d.getFullYear(), d.getMonth() + 1);
      return {
        mes: format(d, 'MMM', { locale: pt }),
        saldo: summary.saldo,
        receitas: summary.receitas,
        despesas: summary.despesas,
      };
    });
  }, [transactions, today]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">
          Olá, {profile?.full_name?.split(' ')[0] || 'bem-vindo'} 👋
        </h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
          {format(today, "EEEE, d 'de' MMMM", { locale: pt })}
        </p>
      </div>

      {/* Quanto posso gastar hoje */}
      <div className="card p-6 bg-gradient-to-br from-brand-600 to-brand-800 text-white border-0">
        <div className="flex items-center gap-2 text-brand-100 text-sm font-medium">
          <Zap size={16} /> Quanto posso gastar hoje?
        </div>
        <p className="font-display text-4xl font-bold mt-2 tabular-nums">
          {formatCurrency(dailyBudget.dailyBudget, currency)}
        </p>
        <p className="text-brand-100/80 text-sm mt-2">
          por dia, durante os próximos {dailyBudget.daysRemaining} dias, sem ultrapassar o teu orçamento mensal.
        </p>
      </div>

      {/* Cartões de estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Saldo atual" value={formatCurrency(totalBalance, currency)} icon={Wallet} />
        <StatCard
          label="Receitas do mês"
          value={formatCurrency(receitas, currency)}
          icon={ArrowUpCircle}
          iconClass="bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400"
          trend={{ value: comparison.receitasChangePercent }}
        />
        <StatCard
          label="Despesas do mês"
          value={formatCurrency(despesas, currency)}
          icon={ArrowDownCircle}
          iconClass="bg-coral-500/10 text-coral-600 dark:text-coral-400"
          trend={{ value: -comparison.despesasChangePercent }}
        />
        <StatCard label="Saldo do mês" value={formatCurrency(saldoMes, currency)} icon={TrendingUp} />
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const Icon = ALERT_ICON[alert.level];
            return (
              <div key={alert.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${ALERT_STYLE[alert.level]}`}>
                <Icon size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="opacity-90 mt-0.5">{alert.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Evolução financeira */}
        <div className="lg:col-span-2 card p-5">
          <p className="font-display font-semibold text-ink-900 dark:text-white mb-4">Evolução financeira (6 meses)</p>
          {txLoading ? (
            <div className="h-64 flex items-center justify-center text-ink-400 text-sm">A carregar…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-ink-100 dark:stroke-ink-800" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="currentColor" className="text-ink-400" />
                <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-ink-400" tickFormatter={(v) => formatCurrency(v, currency).split(',')[0]} width={80} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value), currency)}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                />
                <Line type="monotone" dataKey="receitas" stroke="#17A48C" strokeWidth={2} dot={false} name="Receitas" />
                <Line type="monotone" dataKey="despesas" stroke="#E85D5D" strokeWidth={2} dot={false} name="Despesas" />
                <Line type="monotone" dataKey="saldo" stroke="#D4A017" strokeWidth={2} dot={false} name="Saldo" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribuição das despesas */}
        <div className="card p-5">
          <p className="font-display font-semibold text-ink-900 dark:text-white mb-4">Despesas por categoria</p>
          {expensesByCategory.length === 0 ? (
            <EmptyState icon={PiggyBank} title="Sem despesas este mês" description="Regista despesas para veres a distribuição aqui." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expensesByCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {expensesByCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto">
            {expensesByCategory.slice(0, 5).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-ink-600 dark:text-ink-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {c.name}
                </span>
                <span className="font-medium text-ink-800 dark:text-white">{formatCurrency(c.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Metas */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display font-semibold text-ink-900 dark:text-white">Metas</p>
            <Link to="/metas" className="text-xs font-medium text-brand-600 dark:text-brand-400">Ver todas</Link>
          </div>
          {activeGoals.length === 0 ? (
            <EmptyState icon={Target} title="Sem metas ativas" description="Cria uma meta para começares a acompanhar o teu progresso." />
          ) : (
            <div className="space-y-4">
              {activeGoals.map((goal) => {
                const progress = calculateGoalProgress(goal);
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-ink-800 dark:text-white truncate">{goal.name}</span>
                      <span className="text-ink-500">{progress.percentComplete}%</span>
                    </div>
                    <ProgressBar percent={progress.percentComplete} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Próximos pagamentos */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display font-semibold text-ink-900 dark:text-white">Próximos pagamentos</p>
            <Link to="/recorrentes" className="text-xs font-medium text-brand-600 dark:text-brand-400">Ver todos</Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Tudo em dia" description="Não tens pagamentos recorrentes a vencer nos próximos 14 dias." />
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 4).map(({ payment, daysUntilDue }) => (
                <div key={payment.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-ink-800 dark:text-white">{payment.name}</p>
                    <p className="text-xs text-ink-400">{daysUntilDue === 0 ? 'Vence hoje' : `Em ${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}`}</p>
                  </div>
                  <span className="font-display font-semibold text-ink-800 dark:text-white">{formatCurrency(payment.amount, currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orçamento restante / Dívidas */}
        <div className="card p-5">
          <p className="font-display font-semibold text-ink-900 dark:text-white mb-4">Resumo</p>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-500 dark:text-ink-400">Orçamentos ativos</span>
              <span className="font-semibold text-ink-800 dark:text-white">{budgets.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500 dark:text-ink-400">Dívidas em aberto</span>
              <span className="font-semibold text-ink-800 dark:text-white">{formatCurrency(totalDebtRemaining, currency)}</span>
            </div>
            {allocation && (
              <div className="pt-3 border-t border-ink-100 dark:border-ink-800">
                <p className="text-xs text-ink-400 mb-2">Distribuição sugerida do rendimento</p>
                <div className="space-y-1.5">
                  <AllocRow label="Necessidades" value={allocation.needs} currency={currency} />
                  <AllocRow label="Poupança" value={allocation.savings} currency={currency} />
                  <AllocRow label="Investimentos" value={allocation.investments} currency={currency} />
                  <AllocRow label="Lazer" value={allocation.leisure} currency={currency} />
                  <AllocRow label="Metas" value={allocation.goals} currency={currency} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AllocRow({ label, value, currency }: { label: string; value: number; currency: import('../types/database').CurrencyCode }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-ink-500 dark:text-ink-400">{label}</span>
      <span className="font-medium text-ink-700 dark:text-ink-200">{formatCurrency(value, currency)}</span>
    </div>
  );
}
