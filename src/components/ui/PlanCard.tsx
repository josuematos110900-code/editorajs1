import { Link } from 'react-router-dom';
import { Crown, Check, ExternalLink, Clock } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { useAccounts } from '../../hooks/useAccounts';
import { useGoals } from '../../hooks/useGoals';
import { useDebts } from '../../hooks/useDebts';
import { useRecurringPayments } from '../../hooks/useRecurring';
import { useBudgets } from '../../hooks/useBudgets';
import { PLAN_LIMITS, getResourceLabel, type PlanResource } from '../../lib/planLimits';
import { ProgressBar } from '../ui/Feedback';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { getUpgradeCheckoutLink, CHECKOUT_UNAVAILABLE_MESSAGE } from '../../lib/checkout';
import { getPriceLabel, getCountryFromCurrency } from '../../lib/plans';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export function PlanCard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: subscription } = useSubscription();
  const { data: accounts = [] } = useAccounts();
  const { data: goals = [] } = useGoals();
  const { data: debts = [] } = useDebts();
  const { data: recurring = [] } = useRecurringPayments();
  const today = new Date();
  const { data: budgets = [] } = useBudgets(today.getFullYear(), today.getMonth() + 1);
  const { showToast } = useToast();

  const plan = subscription?.plan ?? 'free';
  const isPremium = plan === 'premium';
  const isTrial = subscription?.status === 'trialing';
  const limits = PLAN_LIMITS[plan];
  const currency = profile?.currency ?? 'AOA';
  const priceLabel = getPriceLabel(currency);

  const trialDaysLeft = isTrial && subscription?.current_period_end
    ? Math.max(0, differenceInCalendarDays(parseISO(subscription.current_period_end), today))
    : null;

  const usage: { resource: PlanResource; current: number }[] = [
    { resource: 'accounts', current: accounts.length },
    { resource: 'goals', current: goals.filter((g) => g.status === 'em_progresso').length },
    { resource: 'debts', current: debts.length },
    { resource: 'budgets', current: budgets.length },
    { resource: 'recurring', current: recurring.length },
  ];

  function handleUpgradeClick() {
    if (!user?.email) {
      showToast('Não foi possível identificar o teu email. Tenta fazer login outra vez.', 'error');
      return;
    }
    const checkout = getUpgradeCheckoutLink({
      currency,
      email: user.email,
      fullName: profile?.full_name,
    });
    if (!checkout) {
      const country = getCountryFromCurrency(currency);
      showToast(CHECKOUT_UNAVAILABLE_MESSAGE[country], 'info');
      return;
    }
    window.open(checkout.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-ink-900 dark:text-white flex items-center gap-2">
            {isPremium && <Crown size={16} className="text-gold-500" />}
            Plano {isPremium ? 'Premium' : 'Free'}
            {isTrial && (
              <span className="badge bg-gold-500/15 text-gold-600 dark:text-gold-400">Trial</span>
            )}
          </h2>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
            {isTrial
              ? `Estás no trial Premium grátis — termina em ${trialDaysLeft} dia${trialDaysLeft === 1 ? '' : 's'}. Depois disso, o plano volta para Free a não ser que faças upgrade.`
              : isPremium
                ? 'Sem limites de contas, metas, dívidas, orçamentos ou pagamentos recorrentes.'
                : 'Estás no plano gratuito. Aqui está o teu uso atual de cada limite.'}
          </p>
          <Link to="/assinatura" className="text-xs text-brand-600 dark:text-brand-400 hover:underline mt-1 inline-block">
            Ver detalhes da assinatura
          </Link>
        </div>
        {!isPremium && (
          <span className="badge bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300 shrink-0">Free</span>
        )}
      </div>

      {isTrial && trialDaysLeft !== null && trialDaysLeft <= 3 && (
        <div className="flex items-center gap-2 rounded-xl bg-gold-500/10 border border-gold-500/30 px-3.5 py-2.5 text-sm text-gold-700 dark:text-gold-400">
          <Clock size={16} className="shrink-0" />
          O teu trial termina {trialDaysLeft === 0 ? 'hoje' : `em ${trialDaysLeft} dia${trialDaysLeft === 1 ? '' : 's'}`} — faz upgrade para não perderes o acesso ilimitado.
        </div>
      )}

      {!isPremium && (
        <div className="space-y-3">
          {usage.map(({ resource, current }) => {
            const limit = limits[resource];
            const percent = isFinite(limit) ? (current / limit) * 100 : 0;
            return (
              <div key={resource}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="capitalize text-ink-600 dark:text-ink-300">{getResourceLabel(resource)}</span>
                  <span className="text-ink-400 tabular-nums">
                    {current} / {isFinite(limit) ? limit : '∞'}
                  </span>
                </div>
                <ProgressBar
                  percent={percent}
                  colorClass={percent >= 100 ? 'bg-coral-500' : percent >= 70 ? 'bg-gold-500' : 'bg-brand-500'}
                />
              </div>
            );
          })}
        </div>
      )}

      {(!isPremium || isTrial) && (
        <div className="rounded-xl border border-dashed border-brand-300 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-900/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-gold-500" />
              <p className="font-medium text-sm text-ink-900 dark:text-white">Premium</p>
            </div>
            <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">{priceLabel}</span>
          </div>
          <ul className="text-xs text-ink-600 dark:text-ink-300 space-y-1 mb-3">
            <li className="flex items-center gap-1.5"><Check size={12} className="text-brand-500 shrink-0" /> Contas, metas, dívidas e recorrentes ilimitados</li>
            <li className="flex items-center gap-1.5"><Check size={12} className="text-brand-500 shrink-0" /> Orçamento sem limite de categorias</li>
          </ul>
          <button type="button" onClick={handleUpgradeClick} className="btn-primary w-full text-sm py-2">
            {isTrial ? 'Manter Premium depois do trial' : 'Fazer upgrade'} <ExternalLink size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
