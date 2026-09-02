import { useMemo, useState } from 'react';
import { PiggyBank, Info } from 'lucide-react';
import { useBudgets, useBudgetMutations } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { useTransactions } from '../hooks/useTransactions';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import { calculateBudgetProgress, filterByMonth } from '../lib/finance';
import { formatCurrency } from '../lib/currency';
import { ProgressBar, EmptyState } from '../components/ui/Feedback';

const ALERT_STYLES = {
  ok: 'text-brand-600 dark:text-brand-400',
  atencao: 'text-gold-600 dark:text-gold-400',
  critico: 'text-coral-600 dark:text-coral-400',
  ultrapassado: 'text-coral-600 dark:text-coral-400',
};

const BAR_COLORS = {
  ok: 'bg-brand-500',
  atencao: 'bg-gold-500',
  critico: 'bg-coral-500',
  ultrapassado: 'bg-coral-600',
};

export default function Orcamento() {
  const { profile } = useProfile();
  const { showToast } = useToast();
  const today = new Date();
  const [year] = useState(today.getFullYear());
  const [month] = useState(today.getMonth() + 1);

  const { data: categories = [] } = useCategories('despesa');
  const { data: budgets = [] } = useBudgets(year, month);
  const { data: transactions = [] } = useTransactions();
  const { upsert } = useBudgetMutations();

  const monthTx = useMemo(() => filterByMonth(transactions, year, month), [transactions, year, month]);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [draftAmount, setDraftAmount] = useState('');

  function startEdit(categoryId: string, current: number) {
    setEditingCategoryId(categoryId);
    setDraftAmount(current ? String(current) : '');
  }

  async function saveBudget(categoryId: string) {
    const amount = Number(draftAmount.replace(',', '.'));
    if (isNaN(amount) || amount < 0) {
      showToast('Indica um valor de orçamento válido.', 'error');
      return;
    }
    try {
      await upsert.mutateAsync({ category_id: categoryId, amount, month, year });
      showToast('Orçamento guardado.');
    } catch (err) {
      // Fase 12: nunca "Erro desconhecido" — mostra a mensagem já
      // traduzida (rpcErrors.ts), incluindo o limite exato do Free
      // quando for esse o caso (Fase 8).
      showToast(err instanceof Error ? err.message : 'Não foi possível guardar o orçamento.', 'error');
    } finally {
      setEditingCategoryId(null);
    }
  }

  const rows = categories.map((cat) => {
    const budget = budgets.find((b) => b.category_id === cat.id);
    const progress = budget ? calculateBudgetProgress(budget, monthTx) : null;
    return { category: cat, budget, progress };
  });

  const totalBudgeted = rows.reduce((acc, r) => acc + (r.budget?.amount ?? 0), 0);
  const totalSpent = rows.reduce((acc, r) => acc + (r.progress?.spent ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Orçamento</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
          Define quanto pretendes gastar em cada categoria este mês. Recebes um alerta a partir de 70% de utilização.
        </p>
      </div>

      <div className="card p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <PiggyBank size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-ink-500 dark:text-ink-400">
            Orçado: <strong className="text-ink-800 dark:text-white">{formatCurrency(totalBudgeted, profile?.currency)}</strong>
            {'  ·  '}
            Gasto: <strong className="text-ink-800 dark:text-white">{formatCurrency(totalSpent, profile?.currency)}</strong>
          </p>
        </div>
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={PiggyBank} title="Sem categorias de despesa" description="Cria categorias em Despesas para poderes definir orçamentos." />
      ) : (
        <div className="card divide-y divide-ink-50 dark:divide-ink-800">
          {rows.map(({ category, budget, progress }) => (
            <div key={category.id} className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                  <p className="font-medium text-sm text-ink-900 dark:text-white">{category.name}</p>
                </div>

                {editingCategoryId === category.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      className="input w-32 py-1.5"
                      inputMode="decimal"
                      value={draftAmount}
                      onChange={(e) => setDraftAmount(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveBudget(category.id)}
                    />
                    <button className="btn-primary py-1.5 px-3 text-xs" onClick={() => saveBudget(category.id)}>
                      Guardar
                    </button>
                  </div>
                ) : (
                  <button
                    className="text-xs font-medium text-brand-600 dark:text-brand-400"
                    onClick={() => startEdit(category.id, budget?.amount ?? 0)}
                  >
                    {budget ? 'Editar' : 'Definir orçamento'}
                  </button>
                )}
              </div>

              {budget && progress ? (
                <>
                  <ProgressBar percent={progress.percentUsed} colorClass={BAR_COLORS[progress.alertLevel]} />
                  <div className="flex justify-between text-xs mt-1.5">
                    <span className={ALERT_STYLES[progress.alertLevel]}>
                      {formatCurrency(progress.spent, profile?.currency)} de {formatCurrency(progress.budgeted, profile?.currency)} ({progress.percentUsed}%)
                    </span>
                    <span className="text-ink-400">
                      {progress.remaining >= 0
                        ? `Restam ${formatCurrency(progress.remaining, profile?.currency)}`
                        : `Excedeu ${formatCurrency(Math.abs(progress.remaining), profile?.currency)}`}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-ink-400 flex items-center gap-1">
                  <Info size={12} /> Sem orçamento definido para esta categoria.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
