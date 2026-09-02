import { useState, type FormEvent } from 'react';
import { Save, Moon, Sun, Plus, Trash2 } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useCategories, useCategoryMutations } from '../hooks/useCategories';
import { CURRENCIES } from '../lib/currency';
import { calculateAllocation } from '../lib/finance';
import { ErrorBanner } from '../components/ui/Feedback';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PlanCard } from '../components/ui/PlanCard';
import type { CurrencyCode, Category, TransactionType } from '../types/database';

export default function Configuracoes() {
  const { profile, updateProfile } = useProfile();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [country, setCountry] = useState(profile?.country ?? 'AO');
  const [currency, setCurrency] = useState<CurrencyCode>(profile?.currency ?? 'AOA');
  const [income, setIncome] = useState(String(profile?.monthly_income ?? 0));
  const [incomeDay, setIncomeDay] = useState(String(profile?.income_day ?? 1));
  const [allocation, setAllocation] = useState({
    needs: profile?.allocation_needs ?? 50,
    savings: profile?.allocation_savings ?? 20,
    investments: profile?.allocation_investments ?? 10,
    leisure: profile?.allocation_leisure ?? 10,
    goals: profile?.allocation_goals ?? 10,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allocationResult = calculateAllocation(Number(income) || 0, allocation);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) return setError('Indica o teu nome.');
    if (!allocationResult.isValid) return setError('As percentagens de distribuição devem somar 100%.');

    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        country,
        currency,
        monthly_income: Number(income.replace(',', '.')) || 0,
        income_day: Number(incomeDay),
        allocation_needs: allocation.needs,
        allocation_savings: allocation.savings,
        allocation_investments: allocation.investments,
        allocation_leisure: allocation.leisure,
        allocation_goals: allocation.goals,
      });
      showToast('Configurações guardadas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Configurações</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Gere o teu perfil, moeda, rendimento e preferências.</p>
      </div>

      <form onSubmit={handleSave} className="card p-6 space-y-5">
        {error && <ErrorBanner message={error} />}
        <div>
          <label className="label">Nome</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input opacity-60" value={user?.email ?? ''} disabled />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">País</label>
            <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="AO">Angola</option>
              <option value="BR">Brasil</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>
          <div>
            <label className="label">Moeda</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Salário / rendimento mensal</label>
            <input className="input" inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} />
          </div>
          <div>
            <label className="label">Dia do recebimento</label>
            <input className="input" type="number" min={1} max={31} value={incomeDay} onChange={(e) => setIncomeDay(e.target.value)} />
          </div>
        </div>

        <div>
          <p className="label mb-3">Distribuição automática do rendimento</p>
          <div className="space-y-3">
            {(
              [
                ['needs', 'Necessidades'],
                ['savings', 'Poupança'],
                ['investments', 'Investimentos'],
                ['leisure', 'Lazer'],
                ['goals', 'Metas'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm text-ink-600 dark:text-ink-300 w-28 shrink-0">{label}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={allocation[key]}
                  onChange={(e) => setAllocation((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                  className="flex-1 accent-brand-600"
                />
                <span className="text-sm text-ink-500 w-10 text-right tabular-nums">{allocation[key]}%</span>
              </div>
            ))}
          </div>
          <p className={`text-xs mt-2 ${allocationResult.isValid ? 'text-brand-600 dark:text-brand-400' : 'text-coral-600 dark:text-coral-400'}`}>
            Total: {allocationResult.totalPercent}% {allocationResult.isValid ? '' : '— precisa de somar 100%'}
          </p>
        </div>

        <div>
          <p className="label mb-2">Tema</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium ${theme === 'light' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-300'}`}>
              <Sun size={16} /> Claro
            </button>
            <button type="button" onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium ${theme === 'dark' ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30' : 'border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-300'}`}>
              <Moon size={16} /> Escuro
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          <Save size={16} /> {saving ? 'A guardar…' : 'Guardar alterações'}
        </button>
      </form>

      <PlanCard />

      <CategoryManager />
    </div>
  );
}

function CategoryManager() {
  const [type, setType] = useState<TransactionType>('despesa');
  const { data: categories = [] } = useCategories(type);
  const { create, remove } = useCategoryMutations();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim(), type, icon: 'tag', color: '#64748B' });
      setName('');
      showToast('Categoria criada.');
    } catch {
      showToast('Não foi possível criar a categoria.', 'error');
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div>
        <h2 className="font-display font-semibold text-ink-900 dark:text-white">Categorias personalizadas</h2>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Cria as tuas próprias categorias além das pré-definidas.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setType('despesa')} className={`btn-secondary py-1.5 px-3 text-xs ${type === 'despesa' ? '!bg-ink-800 !text-white dark:!bg-white dark:!text-ink-900' : ''}`}>
          Despesa
        </button>
        <button onClick={() => setType('receita')} className={`btn-secondary py-1.5 px-3 text-xs ${type === 'receita' ? '!bg-ink-800 !text-white dark:!bg-white dark:!text-ink-900' : ''}`}>
          Receita
        </button>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input className="input flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da nova categoria" />
        <button type="submit" className="btn-primary px-3" disabled={create.isPending}>
          <Plus size={16} />
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <span key={c.id} className="badge bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 gap-1.5">
            {c.name}
            {!c.is_default && (
              <button onClick={() => setDeleteCategory(c)} aria-label={`Eliminar ${c.name}`}>
                <Trash2 size={12} />
              </button>
            )}
          </span>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteCategory}
        title="Eliminar categoria"
        message={`Tens a certeza que queres eliminar "${deleteCategory?.name}"? As transações associadas ficam sem categoria.`}
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (!deleteCategory) return;
          try {
            await remove.mutateAsync(deleteCategory.id);
            showToast('Categoria eliminada.');
          } catch {
            showToast('Não foi possível eliminar.', 'error');
          } finally {
            setDeleteCategory(null);
          }
        }}
        onCancel={() => setDeleteCategory(null)}
      />
    </div>
  );
}
