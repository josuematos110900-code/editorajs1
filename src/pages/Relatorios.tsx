import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAccounts, useAccountBalances } from '../hooks/useAccounts';
import { useProfile } from '../context/ProfileContext';
import { formatCurrency } from '../lib/currency';
import { filterByMonth, getMonthSummary, comparePeriods, groupExpensesByCategory } from '../lib/finance';
import { subMonths, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { EmptyState } from '../components/ui/Feedback';

const MONTH_OPTIONS = Array.from({ length: 12 }).map((_, i) => {
  const d = subMonths(new Date(), i);
  return { value: `${d.getFullYear()}-${d.getMonth() + 1}`, label: format(d, "MMMM 'de' yyyy", { locale: pt }), year: d.getFullYear(), month: d.getMonth() + 1 };
});

export default function Relatorios() {
  const { profile } = useProfile();
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: balances = [] } = useAccountBalances();

  const [currentPeriod, setCurrentPeriod] = useState(MONTH_OPTIONS[0].value);
  const [comparePeriod, setComparePeriod] = useState(MONTH_OPTIONS[1]?.value ?? MONTH_OPTIONS[0].value);
  const [accountFilter, setAccountFilter] = useState('');

  const currentOpt = MONTH_OPTIONS.find((o) => o.value === currentPeriod)!;
  const compareOpt = MONTH_OPTIONS.find((o) => o.value === comparePeriod)!;

  const filteredTx = accountFilter ? transactions.filter((t) => t.account_id === accountFilter) : transactions;

  const currentSummary = getMonthSummary(filteredTx, currentOpt.year, currentOpt.month);
  const previousSummary = getMonthSummary(filteredTx, compareOpt.year, compareOpt.month);
  const comparison = comparePeriods(currentSummary, previousSummary);

  const categoryNameById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const currentMonthTx = filterByMonth(filteredTx, currentOpt.year, currentOpt.month);
  const previousMonthTx = filterByMonth(filteredTx, compareOpt.year, compareOpt.month);

  const currentByCategory = groupExpensesByCategory(currentMonthTx, categoryNameById);
  const previousByCategory = groupExpensesByCategory(previousMonthTx, categoryNameById);

  const comparisonChartData = useMemo(() => {
    const names = new Set([...currentByCategory.map((c) => c.name), ...previousByCategory.map((c) => c.name)]);
    return Array.from(names).map((name) => ({
      categoria: name,
      [currentOpt.label]: currentByCategory.find((c) => c.name === name)?.value ?? 0,
      [compareOpt.label]: previousByCategory.find((c) => c.name === name)?.value ?? 0,
    }));
  }, [currentByCategory, previousByCategory, currentOpt.label, compareOpt.label]);

  const growingCategories = currentByCategory
    .map((c) => {
      const prev = previousByCategory.find((p) => p.name === c.name)?.value ?? 0;
      const change = prev === 0 ? 100 : ((c.value - prev) / prev) * 100;
      return { name: c.name, change, value: c.value };
    })
    .filter((c) => c.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 3);

  const totalBalance = balances.reduce((acc, b) => acc + Number(b.balance), 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Relatórios</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Compara períodos e acompanha a tua evolução financeira.</p>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="label">Período</label>
          <select className="input" value={currentPeriod} onChange={(e) => setCurrentPeriod(e.target.value)}>
            {MONTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="label">Comparar com</label>
          <select className="input" value={comparePeriod} onChange={(e) => setComparePeriod(e.target.value)}>
            {MONTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="label">Conta</label>
          <select className="input" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
            <option value="">Todas as contas</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <ReportStat label="Receitas" value={currentSummary.receitas} change={comparison.receitasChangePercent} currency={profile?.currency} />
        <ReportStat label="Despesas" value={currentSummary.despesas} change={comparison.despesasChangePercent} currency={profile?.currency} invert />
        <ReportStat label="Saldo" value={currentSummary.saldo} change={comparison.saldoChangePercent} currency={profile?.currency} />
      </div>

      <div className="card p-5">
        <p className="font-display font-semibold text-ink-900 dark:text-white mb-4">
          Despesas por categoria: {currentOpt.label} vs {compareOpt.label}
        </p>
        {comparisonChartData.length === 0 ? (
          <EmptyState icon={BarChart3} title="Sem dados para comparar" description="Regista despesas nos períodos selecionados para veres a comparação." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparisonChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-ink-100 dark:stroke-ink-800" />
              <XAxis dataKey="categoria" tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-ink-400" width={80} tickFormatter={(v) => formatCurrency(v, profile?.currency).split(',')[0]} />
              <Tooltip formatter={(value) => formatCurrency(Number(value), profile?.currency)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey={currentOpt.label} fill="#17A48C" radius={[4, 4, 0, 0]} />
              <Bar dataKey={compareOpt.label} fill="#A6B4D0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {growingCategories.length > 0 && (
        <div className="card p-5">
          <p className="font-display font-semibold text-ink-900 dark:text-white mb-3">Categorias com maior crescimento</p>
          <div className="space-y-2">
            {growingCategories.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="text-ink-700 dark:text-ink-300">{c.name}</span>
                <span className="flex items-center gap-1 text-coral-600 dark:text-coral-400 font-medium">
                  <TrendingUp size={14} /> +{Math.round(c.change)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <p className="text-sm text-ink-500 dark:text-ink-400">Saldo total atual (todas as contas)</p>
        <p className="font-display text-2xl font-bold text-ink-900 dark:text-white mt-1">{formatCurrency(totalBalance, profile?.currency)}</p>
      </div>
    </div>
  );
}

function ReportStat({ label, value, change, currency, invert }: { label: string; value: number; change: number; currency?: import('../types/database').CurrencyCode; invert?: boolean }) {
  const positive = invert ? change <= 0 : change >= 0;
  return (
    <div className="card p-5">
      <p className="text-sm text-ink-500 dark:text-ink-400">{label}</p>
      <p className="font-display text-2xl font-bold text-ink-900 dark:text-white mt-1.5 tabular-nums">{formatCurrency(value, currency)}</p>
      <div className={`inline-flex items-center gap-1 text-xs font-medium mt-2 ${positive ? 'text-brand-600 dark:text-brand-400' : 'text-coral-600 dark:text-coral-400'}`}>
        {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {Math.abs(change)}% vs período de comparação
      </div>
    </div>
  );
}
