import { useState, type FormEvent } from 'react';
import { Plus, CreditCard, Trash2, Landmark } from 'lucide-react';
import { useDebts, useDebtMutations } from '../hooks/useDebts';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import { calculateDebtProgress } from '../lib/finance';
import { formatCurrency } from '../lib/currency';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, ProgressBar, ErrorBanner } from '../components/ui/Feedback';
import type { Debt } from '../types/database';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function Dividas() {
  const { profile } = useProfile();
  const { data: debts = [], isLoading } = useDebts();
  const { remove } = useDebtMutations();
  const { showToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [payDebt, setPayDebt] = useState<Debt | null>(null);
  const [deleteDebt, setDeleteDebt] = useState<Debt | null>(null);

  const active = debts.filter((d) => d.status === 'ativa');
  const paid = debts.filter((d) => d.status === 'quitada');
  const totalRemaining = active.reduce((acc, d) => acc + (Number(d.total_amount) - Number(d.paid_amount)), 0);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Dívidas</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
            Total em aberto: <strong className="text-coral-600 dark:text-coral-400">{formatCurrency(totalRemaining, profile?.currency)}</strong>
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Nova dívida
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-ink-400 text-sm py-10">A carregar…</div>
      ) : debts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sem dívidas registadas"
          description="Regista as tuas dívidas para acompanhares o progresso do pagamento."
          action={<button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Adicionar dívida</button>}
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              {active.map((debt) => {
                const progress = calculateDebtProgress(Number(debt.total_amount), Number(debt.paid_amount));
                return (
                  <div key={debt.id} className="card p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-coral-500/10 text-coral-600 dark:text-coral-400 flex items-center justify-center shrink-0">
                          <Landmark size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-ink-900 dark:text-white">{debt.name}</p>
                          {debt.creditor && <p className="text-xs text-ink-400">{debt.creditor}</p>}
                        </div>
                      </div>
                      <button onClick={() => setDeleteDebt(debt)} className="p-1.5 rounded-lg text-ink-400 hover:bg-coral-50 hover:text-coral-600 dark:hover:bg-coral-900/20" aria-label="Eliminar dívida">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mt-4">
                      <ProgressBar percent={progress.percentPaid} colorClass="bg-coral-500" />
                      <div className="flex justify-between text-xs mt-1.5 text-ink-500 dark:text-ink-400">
                        <span>Pago: {formatCurrency(Number(debt.paid_amount), profile?.currency)}</span>
                        <span>{progress.percentPaid}%</span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-ink-500 dark:text-ink-400 space-y-1">
                      <p>Restante: <strong className="text-ink-800 dark:text-white">{formatCurrency(progress.remaining, profile?.currency)}</strong></p>
                      {debt.installment_amount > 0 && <p>Prestação: {formatCurrency(Number(debt.installment_amount), profile?.currency)}</p>}
                      {debt.due_date && <p>Vencimento: {format(parseISO(debt.due_date), "d 'de' MMM 'de' yyyy", { locale: pt })}</p>}
                      {debt.interest_rate > 0 && <p>Taxa de juros: {debt.interest_rate}%</p>}
                    </div>

                    <button className="btn-secondary w-full mt-4" onClick={() => setPayDebt(debt)}>
                      Registar pagamento
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {paid.length > 0 && (
            <div>
              <p className="font-display font-semibold text-ink-900 dark:text-white mb-3">Dívidas quitadas</p>
              <div className="card divide-y divide-ink-50 dark:divide-ink-800">
                {paid.map((debt) => (
                  <div key={debt.id} className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm text-ink-700 dark:text-ink-300">{debt.name}</p>
                    <span className="badge bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">Quitada</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nova dívida">
        <NewDebtForm onDone={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!payDebt} onClose={() => setPayDebt(null)} title={`Registar pagamento${payDebt ? `: ${payDebt.name}` : ''}`}>
        {payDebt && <PayDebtForm debt={payDebt} onDone={() => setPayDebt(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!deleteDebt}
        title="Eliminar dívida"
        message={`Tens a certeza que queres eliminar "${deleteDebt?.name}"? O histórico de pagamentos também será removido.`}
        confirmLabel="Eliminar"
        loading={remove.isPending}
        onConfirm={async () => {
          if (!deleteDebt) return;
          try {
            await remove.mutateAsync(deleteDebt.id);
            showToast('Dívida eliminada.');
          } catch {
            showToast('Não foi possível eliminar.', 'error');
          } finally {
            setDeleteDebt(null);
          }
        }}
        onCancel={() => setDeleteDebt(null)}
      />
    </div>
  );
}

function NewDebtForm({ onDone }: { onDone: () => void }) {
  const { create } = useDebtMutations();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Indica o nome da dívida.');
    const total = Number(totalAmount.replace(',', '.'));
    if (!total || total <= 0) return setError('Indica um valor total válido.');

    try {
      await create.mutateAsync({
        name: name.trim(),
        creditor: creditor.trim(),
        total_amount: total,
        installment_amount: Number(installmentAmount.replace(',', '.')) || 0,
        due_date: dueDate || null,
        interest_rate: Number(interestRate.replace(',', '.')) || 0,
        notes: '',
      });
      showToast('Dívida adicionada.');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível adicionar a dívida.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <div>
        <label className="label">Nome da dívida</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Empréstimo bancário" />
      </div>
      <div>
        <label className="label">Credor (opcional)</label>
        <input className="input" value={creditor} onChange={(e) => setCreditor(e.target.value)} placeholder="Ex: Banco X" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Valor total</label>
          <input className="input" inputMode="decimal" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Prestação (opcional)</label>
          <input className="input" inputMode="decimal" value={installmentAmount} onChange={(e) => setInstallmentAmount(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Vencimento (opcional)</label>
          <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Taxa de juros % (opcional)</label>
          <input className="input" inputMode="decimal" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="0" />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full" disabled={create.isPending}>
        {create.isPending ? 'A adicionar…' : 'Adicionar dívida'}
      </button>
    </form>
  );
}

function PayDebtForm({ debt, onDone }: { debt: Debt; onDone: () => void }) {
  const { registerPayment } = useDebtMutations();
  const { showToast } = useToast();
  const [amount, setAmount] = useState(debt.installment_amount ? String(debt.installment_amount) : '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const numericAmount = Number(amount.replace(',', '.'));
    if (!numericAmount || numericAmount <= 0) return setError('Indica um valor válido.');

    try {
      await registerPayment.mutateAsync({ debt_id: debt.id, amount: numericAmount, date });
      showToast('Pagamento registado.');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registar o pagamento.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <div>
        <label className="label">Valor pago</label>
        <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div>
        <label className="label">Data</label>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={registerPayment.isPending}>
        {registerPayment.isPending ? 'A registar…' : 'Registar pagamento'}
      </button>
    </form>
  );
}
