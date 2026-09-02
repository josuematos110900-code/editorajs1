import { useState } from 'react';
import { Wallet2, Check } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAccountMutations } from '../hooks/useAccounts';
import { useToast } from '../context/ToastContext';
import { calculateAllocation } from '../lib/finance';
import { formatCurrency, CURRENCIES } from '../lib/currency';
import type { CurrencyCode } from '../types/database';

const STEPS = ['País e moeda', 'Rendimento', 'Distribuição', 'Primeira conta'] as const;

const COUNTRIES = [
  { code: 'AO', name: 'Angola', currency: 'AOA' as CurrencyCode },
  { code: 'BR', name: 'Brasil', currency: 'BRL' as CurrencyCode },
];

export default function Onboarding() {
  const { profile, updateProfile } = useProfile();
  const { create: createAccount } = useAccountMutations();
  const { showToast } = useToast();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [country, setCountry] = useState('AO');
  const [currency, setCurrency] = useState<CurrencyCode>('AOA');
  const [income, setIncome] = useState('');
  const [incomeDay, setIncomeDay] = useState('1');
  const [mainGoal, setMainGoal] = useState('');
  const [savingsPercent, setSavingsPercent] = useState('20');

  const [allocation, setAllocation] = useState({ needs: 50, savings: 20, investments: 10, leisure: 10, goals: 10 });
  const [accountName, setAccountName] = useState('Carteira principal');
  const [initialBalance, setInitialBalance] = useState('0');

  const incomeValue = parseFloat(income.replace(',', '.')) || 0;
  const allocationResult = calculateAllocation(incomeValue, allocation);

  function updateAllocationField(key: keyof typeof allocation, value: number) {
    setAllocation((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function finish() {
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        country,
        currency,
        monthly_income: incomeValue,
        income_day: Number(incomeDay),
        main_goal: mainGoal,
        savings_target_percent: Number(savingsPercent),
        allocation_needs: allocation.needs,
        allocation_savings: allocation.savings,
        allocation_investments: allocation.investments,
        allocation_leisure: allocation.leisure,
        allocation_goals: allocation.goals,
        onboarding_completed: true,
      });
      await createAccount.mutateAsync({
        name: accountName.trim() || 'Carteira principal',
        type: 'banco',
        initial_balance: parseFloat(initialBalance.replace(',', '.')) || 0,
        color: '#17A48C',
        icon: 'wallet',
      });
      showToast('Perfil configurado com sucesso! Bem-vindo ao FinançasPro.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao concluir configuração', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950 flex flex-col">
      <header className="flex items-center gap-2.5 px-6 py-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white">
          <Wallet2 size={18} />
        </div>
        <span className="font-display font-bold text-ink-900 dark:text-white">FinançasPro</span>
      </header>

      {/* Progresso */}
      <div className="px-6 max-w-xl w-full mx-auto">
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-ink-200 dark:bg-ink-800'}`} />
              <p className={`text-[11px] mt-1.5 hidden sm:block ${i === step ? 'text-brand-600 dark:text-brand-400 font-medium' : 'text-ink-400'}`}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 pb-16">
        <div className="max-w-xl w-full mx-auto card p-6 sm:p-8 animate-fade-up">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display font-bold text-xl text-ink-900 dark:text-white">Vamos conhecer-te</h2>
                <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Só precisamos de alguns dados para configurar a tua conta.</p>
              </div>
              <div>
                <label className="label">O teu nome</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Como te chamas?" />
              </div>
              <div>
                <label className="label">País</label>
                <div className="grid grid-cols-2 gap-2">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCountry(c.code);
                        setCurrency(c.currency);
                      }}
                      className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                        country === c.code
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                          : 'border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-300 hover:border-ink-300'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Moeda principal</label>
                <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                  {Object.values(CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display font-bold text-xl text-ink-900 dark:text-white">O teu rendimento</h2>
                <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Usamos isto para calcular o teu orçamento diário e distribuição do salário.</p>
              </div>
              <div>
                <label className="label">Salário / rendimento mensal</label>
                <input className="input" inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label">Dia do recebimento</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={31}
                  value={incomeDay}
                  onChange={(e) => setIncomeDay(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Objetivo principal</label>
                <input className="input" value={mainGoal} onChange={(e) => setMainGoal(e.target.value)} placeholder="Ex: juntar para um computador" />
              </div>
              <div>
                <label className="label">Percentagem pretendida para poupança</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={savingsPercent}
                  onChange={(e) => setSavingsPercent(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display font-bold text-xl text-ink-900 dark:text-white">Distribuição automática</h2>
                <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
                  Ajusta as percentagens como preferires. Precisam de somar 100%.
                </p>
              </div>
              {(
                [
                  ['needs', 'Necessidades'],
                  ['savings', 'Poupança'],
                  ['investments', 'Investimentos'],
                  ['leisure', 'Lazer'],
                  ['goals', 'Metas'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink-700 dark:text-ink-300 font-medium">{label}</span>
                    <span className="text-ink-500">
                      {allocation[key]}% · {formatCurrency((incomeValue * allocation[key]) / 100, currency)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={allocation[key]}
                    onChange={(e) => updateAllocationField(key, Number(e.target.value))}
                    className="w-full accent-brand-600"
                  />
                </div>
              ))}
              <div
                className={`text-sm rounded-xl px-3.5 py-2.5 ${
                  allocationResult.isValid
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'bg-coral-50 text-coral-600 dark:bg-coral-900/20 dark:text-coral-400'
                }`}
              >
                Total: {allocationResult.totalPercent}%{' '}
                {allocationResult.isValid ? '— perfeito!' : '— ajusta para somar 100%'}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display font-bold text-xl text-ink-900 dark:text-white">A tua primeira conta</h2>
                <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">Todas as transações ficam associadas a uma conta ou carteira.</p>
              </div>
              <div>
                <label className="label">Nome da conta</label>
                <input className="input" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Ex: Conta salário" />
              </div>
              <div>
                <label className="label">Saldo inicial (opcional)</label>
                <input className="input" inputMode="decimal" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} placeholder="0" />
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <button className="btn-ghost" onClick={back} disabled={step === 0}>
              Voltar
            </button>
            {step < STEPS.length - 1 ? (
              <button className="btn-primary" onClick={next} disabled={step === 2 && !allocationResult.isValid}>
                Continuar
              </button>
            ) : (
              <button className="btn-primary" onClick={finish} disabled={saving}>
                {saving ? 'A concluir…' : (<><Check size={16} /> Ir para o Dashboard</>)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
