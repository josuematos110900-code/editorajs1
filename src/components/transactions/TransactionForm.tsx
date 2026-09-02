import { useState, type FormEvent } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { useAccounts } from '../../hooks/useAccounts';
import { useTransactionMutations } from '../../hooks/useTransactions';
import { useToast } from '../../context/ToastContext';
import { ErrorBanner } from '../ui/Feedback';
import type { Transaction } from '../../types/database';

interface TransactionFormProps {
  type: 'receita' | 'despesa';
  onDone: () => void;
  initial?: Transaction | null;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export function TransactionForm({ type, onDone, initial }: TransactionFormProps) {
  const { data: categories = [] } = useCategories(type);
  const { data: accounts = [] } = useAccounts();
  const { create, update } = useTransactionMutations();
  const { showToast } = useToast();

  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? categories[0]?.id ?? '');
  const [accountId, setAccountId] = useState(initial?.account_id ?? accounts[0]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initial;
  const loading = create.isPending || update.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) return setError('Indica uma descrição.');
    const numericAmount = Number(amount.replace(',', '.'));
    if (!numericAmount || numericAmount <= 0) return setError('Indica um valor válido, maior que zero.');
    if (!accountId) return setError('Escolhe uma conta. Cria uma conta primeiro em "Contas".');
    if (!date) return setError('Escolhe uma data válida.');

    try {
      if (isEditing) {
        await update.mutateAsync({
          id: initial.id,
          patch: {
            description: description.trim(),
            amount: numericAmount,
            category_id: categoryId || null,
            account_id: accountId,
            date,
            notes,
          },
        });
        showToast('Transação atualizada.');
      } else {
        await create.mutateAsync({
          type,
          description: description.trim(),
          amount: numericAmount,
          category_id: categoryId || null,
          account_id: accountId,
          transfer_to_account_id: null,
          date,
          notes,
        });
        showToast(type === 'receita' ? 'Receita adicionada.' : 'Despesa adicionada.');
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro. Tenta novamente.');
    }
  }

  if (accounts.length === 0) {
    return (
      <ErrorBanner message='Ainda não tens nenhuma conta. Cria uma conta em "Contas" antes de registares transações.' />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <div>
        <label className="label" htmlFor="description">Descrição</label>
        <input
          id="description"
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={type === 'receita' ? 'Ex: Salário de Agosto' : 'Ex: Compras no mercado'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="amount">Valor</label>
          <input
            id="amount"
            inputMode="decimal"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="label" htmlFor="date">Data</label>
          <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="category">Categoria</label>
          <select id="category" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="account">Conta</label>
          <select id="account" className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">Observação (opcional)</label>
        <textarea
          id="notes"
          className="input min-h-[70px] resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Adiciona uma nota, se quiseres"
        />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'A guardar…' : isEditing ? 'Guardar alterações' : `Adicionar ${type === 'receita' ? 'receita' : 'despesa'}`}
      </button>
    </form>
  );
}
