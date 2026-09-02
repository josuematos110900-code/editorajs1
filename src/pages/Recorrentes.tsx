import { useState, type FormEvent } from 'react';
import { Plus, Repeat, Trash2, CheckCircle2 } from 'lucide-react';
import { useRecurringPayments, useRecurringMutations } from '../hooks/useRecurring';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../lib/currency';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorBanner } from '../components/ui/Feedback';
import type { RecurringPayment, RecurrenceFrequency, TransactionType } from '../types/database';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { pt } from 'date-fns/locale';

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  nenhuma: 'Uma vez',
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  anual: 'Anual',
};

export default function Recorrentes() {
  const { profile } = useProfile();
  const { data: payments = [], isLoading } = useRecurringPayments();
  const { remove, markAsPaid } = useRecurringMutations();
  const { showToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [deletePayment, setDeletePayment] = useState<RecurringPayment | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function handleMarkAsPaid(payment: RecurringPayment) {
    setPayingId(payment.id);
    try {
      await markAsPaid.mutateAsync(payment);
      showToast(`${payment.name} marcado como pago.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível registar o pagamento.', 'error');
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Pagamentos recorrentes</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Renda, internet, assinaturas e outras despesas fixas.</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Novo recorrente
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-ink-400 text-sm py-10">A carregar…</div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Sem pagamentos recorrentes"
          description="Adiciona a renda, internet, energia ou outras despesas fixas para nunca te esqueceres delas."
          action={<button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Adicionar</button>}
        />
      ) : (
        <div className="card divide-y divide-ink-50 dark:divide-ink-800">
          {payments.map((payment) => {
            const daysUntil = differenceInCalendarDays(parseISO(payment.next_due_date), new Date());
            return (
              <div key={payment.id} className="flex items-center justify-between gap-3 px-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-ink-900 dark:text-white truncate">{payment.name}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
                    {FREQUENCY_LABELS[payment.frequency]} · Próximo vencimento: {format(parseISO(payment.next_due_date), "d 'de' MMM", { locale: pt })}
                    {daysUntil <= 3 && daysUntil >= 0 && (
                      <span className="text-coral-600 dark:text-coral-400 font-medium"> · {daysUntil === 0 ? 'Vence hoje' : `Em ${daysUntil}d`}</span>
                    )}
                    {daysUntil < 0 && <span className="text-coral-600 dark:text-coral-400 font-medium"> · Em atraso</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-display font-semibold text-sm text-ink-900 dark:text-white tabular-nums">
                    {formatCurrency(payment.amount, profile?.currency)}
                  </span>
                  <button
                    onClick={() => handleMarkAsPaid(payment)}
                    disabled={payingId === payment.id}
                    className="btn-secondary py-1.5 px-3 text-xs"
                    title="Marcar como pago e criar transação"
                  >
                    <CheckCircle2 size={14} /> {payingId === payment.id ? 'A processar…' : 'Marcar pago'}
                  </button>
                  <button
                    onClick={() => setDeletePayment(payment)}
                    className="p-1.5 rounded-lg text-ink-400 hover:bg-coral-50 hover:text-coral-600 dark:hover:bg-coral-900/20"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Novo pagamento recorrente">
        <NewRecurringForm onDone={() => setCreateOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={!!deletePayment}
        title="Eliminar pagamento recorrente"
        message={`Tens a certeza que queres eliminar "${deletePayment?.name}"? As transações já criadas não serão apagadas.`}
        confirmLabel="Eliminar"
        loading={remove.isPending}
        onConfirm={async () => {
          if (!deletePayment) return;
          try {
            await remove.mutateAsync(deletePayment.id);
            showToast('Pagamento recorrente eliminado.');
          } catch {
            showToast('Não foi possível eliminar.', 'error');
          } finally {
            setDeletePayment(null);
          }
        }}
        onCancel={() => setDeletePayment(null)}
      />
    </div>
  );
}

function NewRecurringForm({ onDone }: { onDone: () => void }) {
  const { create } = useRecurringMutations();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('despesa');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('mensal');
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Indica o nome do pagamento.');
    const numericAmount = Number(amount.replace(',', '.'));
    if (!numericAmount || numericAmount <= 0) return setError('Indica um valor válido.');
    if (!accountId) return setError('Escolhe uma conta.');

    try {
      await create.mutateAsync({
        name: name.trim(),
        amount: numericAmount,
        type,
        frequency,
        next_due_date: nextDueDate,
        category_id: categoryId || null,
        account_id: accountId,
      });
      showToast('Pagamento recorrente criado.');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <div>
        <label className="label">Nome</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Internet" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Valor</label>
          <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Frequência</label>
          <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}>
            {Object.entries(FREQUENCY_LABELS).filter(([k]) => k !== 'nenhuma').map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Próximo vencimento</label>
          <input type="date" className="input" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Categoria</label>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categories.filter((c) => c.type === type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Conta</label>
          <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <button type="submit" className="btn-primary w-full" disabled={create.isPending || accounts.length === 0}>
        {create.isPending ? 'A criar…' : 'Criar pagamento recorrente'}
      </button>
    </form>
  );
}
