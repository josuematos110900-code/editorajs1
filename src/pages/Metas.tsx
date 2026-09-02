import { useState, type FormEvent } from 'react';
import { Plus, Target, Coins, Trash2 } from 'lucide-react';
import { useGoals, useGoalMutations } from '../hooks/useGoals';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import { calculateGoalProgress } from '../lib/finance';
import { formatCurrency } from '../lib/currency';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorBanner } from '../components/ui/Feedback';
import type { Goal } from '../types/database';

const COLORS = ['#17A48C', '#D4A017', '#3B82F6', '#8B5CF6', '#E85D5D', '#EC4899'];

export default function Metas() {
  const { profile } = useProfile();
  const { data: goals = [], isLoading } = useGoals();
  const { remove } = useGoalMutations();
  const { showToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Metas</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
            Define objetivos e acompanha quanto falta para os alcançares.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Nova meta
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-ink-400 text-sm py-10">A carregar…</div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Ainda sem metas"
          description='Cria a tua primeira meta, como "Comprar computador" ou "Fundo de emergência".'
          action={
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Criar meta
            </button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const progress = calculateGoalProgress(goal);
            return (
              <div key={goal.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: goal.color }}
                    >
                      <Target size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-ink-900 dark:text-white">{goal.name}</p>
                      {goal.status === 'concluida' && (
                        <span className="badge bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 mt-1">
                          Concluída
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteGoal(goal)}
                    className="p-1.5 rounded-lg text-ink-400 hover:bg-coral-50 hover:text-coral-600 dark:hover:bg-coral-900/20"
                    aria-label="Eliminar meta"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-4">
                  <div className="h-2 w-full rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, progress.percentComplete)}%`, backgroundColor: goal.color }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-2 text-ink-500 dark:text-ink-400">
                    <span>{formatCurrency(goal.current_amount, profile?.currency)}</span>
                    <span>{progress.percentComplete}%</span>
                    <span>{formatCurrency(goal.target_amount, profile?.currency)}</span>
                  </div>
                </div>

                <div className="mt-4 text-xs text-ink-500 dark:text-ink-400 space-y-1">
                  <p>Falta: <strong className="text-ink-800 dark:text-white">{formatCurrency(progress.remainingAmount, profile?.currency)}</strong></p>
                  {progress.suggestedMonthlySaving !== null && (
                    <p>
                      Sugestão: poupar <strong className="text-ink-800 dark:text-white">{formatCurrency(progress.suggestedMonthlySaving, profile?.currency)}</strong>/mês
                      {progress.monthsRemaining && ` durante ${progress.monthsRemaining} meses`}
                    </p>
                  )}
                </div>

                {goal.status !== 'concluida' && (
                  <button className="btn-secondary w-full mt-4" onClick={() => setContributeGoal(goal)}>
                    <Coins size={15} /> Adicionar poupança
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nova meta">
        <NewGoalForm onDone={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={!!contributeGoal}
        onClose={() => setContributeGoal(null)}
        title={`Adicionar poupança${contributeGoal ? `: ${contributeGoal.name}` : ''}`}
      >
        {contributeGoal && <ContributeForm goal={contributeGoal} onDone={() => setContributeGoal(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!deleteGoal}
        title="Eliminar meta"
        message={`Tens a certeza que queres eliminar a meta "${deleteGoal?.name}"? O histórico de contribuições também será removido.`}
        confirmLabel="Eliminar"
        loading={remove.isPending}
        onConfirm={async () => {
          if (!deleteGoal) return;
          try {
            await remove.mutateAsync(deleteGoal.id);
            showToast('Meta eliminada.');
          } catch {
            showToast('Não foi possível eliminar a meta.', 'error');
          } finally {
            setDeleteGoal(null);
          }
        }}
        onCancel={() => setDeleteGoal(null)}
      />
    </div>
  );
}

function NewGoalForm({ onDone }: { onDone: () => void }) {
  const { create } = useGoalMutations();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Indica o nome da meta.');
    const amount = Number(targetAmount.replace(',', '.'));
    if (!amount || amount <= 0) return setError('Indica um valor objetivo válido.');

    try {
      await create.mutateAsync({
        name: name.trim(),
        target_amount: amount,
        deadline: deadline || null,
        color,
        icon: 'target',
      });
      showToast('Meta criada.');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a meta.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <div>
        <label className="label">Nome da meta</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Comprar computador" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Valor objetivo</label>
          <input className="input" inputMode="decimal" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="800000" />
        </div>
        <div>
          <label className="label">Prazo (opcional)</label>
          <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Cor</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-ink-400 dark:ring-offset-ink-900' : ''}`}
              style={{ backgroundColor: c }}
              aria-label={`Escolher cor ${c}`}
            />
          ))}
        </div>
      </div>
      <button type="submit" className="btn-primary w-full" disabled={create.isPending}>
        {create.isPending ? 'A criar…' : 'Criar meta'}
      </button>
    </form>
  );
}

function ContributeForm({ goal, onDone }: { goal: Goal; onDone: () => void }) {
  const { addContribution } = useGoalMutations();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const numericAmount = Number(amount.replace(',', '.'));
    if (!numericAmount || numericAmount <= 0) return setError('Indica um valor válido.');

    try {
      await addContribution.mutateAsync({ goal_id: goal.id, amount: numericAmount, date });
      showToast('Poupança adicionada à meta.');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível adicionar a poupança.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <div>
        <label className="label">Valor</label>
        <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
      </div>
      <div>
        <label className="label">Data</label>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={addContribution.isPending}>
        {addContribution.isPending ? 'A guardar…' : 'Adicionar'}
      </button>
    </form>
  );
}
