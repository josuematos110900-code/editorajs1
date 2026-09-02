import { useMemo, useState } from 'react';
import { Search, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useTransactions, useTransactionMutations, type TransactionFilters } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { useAccounts } from '../../hooks/useAccounts';
import { useProfile } from '../../context/ProfileContext';
import { formatCurrency } from '../../lib/currency';
import { EmptyState } from '../ui/Feedback';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import type { Transaction, TransactionType } from '../../types/database';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

interface TransactionListProps {
  type: TransactionType;
  onEdit: (transaction: Transaction) => void;
}

export function TransactionList({ type, onEdit }: TransactionListProps) {
  const { profile } = useProfile();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { remove } = useTransactionMutations();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [sortDesc, setSortDesc] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters: TransactionFilters = {
    type,
    search: search || undefined,
    categoryId: categoryFilter || undefined,
    accountId: accountFilter || undefined,
  };

  const { data: transactions = [], isLoading } = useTransactions(filters);

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? 'Sem categoria';
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—';

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => (sortDesc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))),
    [transactions, sortDesc]
  );

  const total = sorted.reduce((acc, t) => acc + Number(t.amount), 0);

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await remove.mutateAsync(deleteId);
      showToast('Transação eliminada.');
    } catch {
      showToast('Não foi possível eliminar. Tenta novamente.', 'error');
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="card">
      <div className="p-4 flex flex-col sm:flex-row gap-2.5 border-b border-ink-100 dark:border-ink-800">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Pesquisar por descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-44" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.filter((c) => c.type === type).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input sm:w-40" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
          <option value="">Todas as contas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <button className="btn-secondary sm:w-auto" onClick={() => setSortDesc((v) => !v)}>
          {sortDesc ? 'Mais recentes' : 'Mais antigas'}
        </button>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-ink-400 text-sm">A carregar…</div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={type === 'receita' ? ArrowUpCircle : ArrowDownCircle}
          title={type === 'receita' ? 'Ainda sem receitas registadas' : 'Ainda sem despesas registadas'}
          description={
            type === 'receita'
              ? 'Adiciona o teu salário ou outras fontes de rendimento para começares a acompanhar o teu dinheiro.'
              : 'Regista as tuas despesas para saberes exatamente para onde vai o teu dinheiro.'
          }
        />
      ) : (
        <>
          <div className="divide-y divide-ink-50 dark:divide-ink-800">
            {sorted.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3.5 group">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-ink-900 dark:text-white truncate">{t.description}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
                    {categoryName(t.category_id)} · {accountName(t.account_id)} ·{' '}
                    {format(parseISO(t.date), "d 'de' MMM", { locale: pt })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`font-display font-semibold text-sm tabular-nums ${
                      type === 'receita' ? 'text-brand-600 dark:text-brand-400' : 'text-coral-600 dark:text-coral-400'
                    }`}
                  >
                    {type === 'receita' ? '+' : '−'} {formatCurrency(Number(t.amount), profile?.currency)}
                  </span>
                  <button
                    onClick={() => onEdit(t)}
                    className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 opacity-0 group-hover:opacity-100 transition"
                    aria-label="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteId(t.id)}
                    className="p-1.5 rounded-lg text-ink-400 hover:bg-coral-50 hover:text-coral-600 dark:hover:bg-coral-900/20 opacity-0 group-hover:opacity-100 transition"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 flex justify-between items-center text-sm border-t border-ink-100 dark:border-ink-800">
            <span className="text-ink-500 dark:text-ink-400">{sorted.length} transações</span>
            <span className="font-display font-semibold text-ink-900 dark:text-white">
              Total: {formatCurrency(total, profile?.currency)}
            </span>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Eliminar transação"
        message="Tens a certeza que queres eliminar esta transação? Esta ação não pode ser desfeita."
        confirmLabel="Eliminar"
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
