import { Crown, Clock, ExternalLink, ShieldCheck, CircleAlert, Ban } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useSubscription } from '../hooks/useSubscription';
import { useBillingHistory } from '../hooks/useBillingHistory';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import { hasActivePremium } from '../lib/premium';
import { getPriceLabel, getCountryFromCurrency } from '../lib/plans';
import { getUpgradeCheckoutLink, CHECKOUT_UNAVAILABLE_MESSAGE } from '../lib/checkout';
import { formatCurrency } from '../lib/currency';
import { Spinner, EmptyState } from '../components/ui/Feedback';
import type { BillingEventStatus, SubscriptionStatus } from '../types/database';

const STATE_LABEL: Record<SubscriptionStatus, string> = {
  active: 'Ativo',
  trialing: 'Teste',
  canceled: 'Cancelado',
  past_due: 'Pagamento pendente',
  expired: 'Expirado',
};

const STATE_BADGE: Record<SubscriptionStatus, string> = {
  active: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
  trialing: 'bg-gold-500/15 text-gold-600 dark:text-gold-400',
  canceled: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  past_due: 'bg-coral-500/15 text-coral-600 dark:text-coral-400',
  expired: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
};

const BILLING_STATUS_LABEL: Record<BillingEventStatus, string> = {
  succeeded: 'Aprovado',
  canceled: 'Cancelado',
  failed: 'Recusado',
  refunded: 'Reembolsado',
  chargeback: 'Chargeback',
  ignored: 'Ignorado',
  user_not_found: 'Não associado',
};

const BILLING_STATUS_BADGE: Record<BillingEventStatus, string> = {
  succeeded: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
  canceled: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  failed: 'bg-coral-500/15 text-coral-600 dark:text-coral-400',
  refunded: 'bg-gold-500/15 text-gold-600 dark:text-gold-400',
  chargeback: 'bg-coral-500/15 text-coral-600 dark:text-coral-400',
  ignored: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
  user_not_found: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return format(parseISO(value), "d 'de' MMM, yyyy", { locale: pt });
  } catch {
    return value;
  }
}

export default function Assinatura() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: subscription, isLoading } = useSubscription();
  const { data: history = [], isLoading: loadingHistory } = useBillingHistory();
  const { showToast } = useToast();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }

  const plan = subscription?.plan ?? 'free';
  const status = subscription?.status ?? 'active';
  const isPremium = plan === 'premium';
  const active = hasActivePremium(subscription);
  const currency = profile?.currency ?? 'AOA';
  const country = getCountryFromCurrency(currency);
  const priceLabel = getPriceLabel(currency);

  function handleUpgrade() {
    if (!user?.email) {
      showToast('Não foi possível identificar o teu email. Tenta fazer login outra vez.', 'error');
      return;
    }
    const checkout = getUpgradeCheckoutLink({ currency, email: user.email, fullName: profile?.full_name });
    if (!checkout) {
      showToast(CHECKOUT_UNAVAILABLE_MESSAGE[country], 'info');
      return;
    }
    window.open(checkout.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Assinatura</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
          O teu plano, estado do pagamento e histórico de faturação.
        </p>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {isPremium && <Crown size={18} className="text-gold-500" />}
            <h2 className="font-display font-semibold text-lg text-ink-900 dark:text-white">
              Plano {isPremium ? 'Premium' : 'Free'}
            </h2>
          </div>
          <span className={`badge ${STATE_BADGE[status]}`}>{STATE_LABEL[status]}</span>
        </div>

        {/* Fase 12 — nunca esconder a informação de cobrança, sempre dizer
            claramente em que estado o pagamento está. */}
        {status === 'trialing' && (
          <div className="flex items-center gap-2 rounded-xl bg-gold-500/10 border border-gold-500/30 px-3.5 py-2.5 text-sm text-gold-700 dark:text-gold-400">
            <Clock size={16} className="shrink-0" />
            Estás no teste Premium gratuito. Não cobramos nada automaticamente — só se fizeres upgrade.
          </div>
        )}
        {status === 'active' && isPremium && (
          <div className="flex items-center gap-2 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-3.5 py-2.5 text-sm text-brand-700 dark:text-brand-300">
            <ShieldCheck size={16} className="shrink-0" />
            O teu Premium está ativo.
          </div>
        )}
        {status === 'canceled' && (
          <div className="flex items-center gap-2 rounded-xl bg-gold-500/10 border border-gold-500/30 px-3.5 py-2.5 text-sm text-gold-700 dark:text-gold-400">
            <Ban size={16} className="shrink-0" />
            {active
              ? `O teu Premium permanece ativo até ${formatDate(subscription?.current_period_end ?? null)}.`
              : 'A tua assinatura foi cancelada.'}
          </div>
        )}
        {status === 'past_due' && (
          <div className="flex items-center gap-2 rounded-xl bg-coral-500/10 border border-coral-500/30 px-3.5 py-2.5 text-sm text-coral-700 dark:text-coral-400">
            <CircleAlert size={16} className="shrink-0" />
            Estamos a verificar o teu pagamento. Se o problema continuar, confirma os dados de pagamento junto do fornecedor.
          </div>
        )}
        {status === 'expired' && (
          <div className="flex items-center gap-2 rounded-xl bg-ink-100 dark:bg-ink-800 border border-ink-200 dark:border-ink-700 px-3.5 py-2.5 text-sm text-ink-600 dark:text-ink-300">
            <CircleAlert size={16} className="shrink-0" />
            O teu Premium terminou. Os teus dados continuam guardados — podes voltar ao Premium a qualquer momento.
          </div>
        )}

        <dl className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-ink-100 dark:border-ink-800">
          <div>
            <dt className="text-ink-400 text-xs">Valor</dt>
            <dd className="text-ink-900 dark:text-white font-medium mt-0.5">{isPremium ? priceLabel : 'Grátis'}</dd>
          </div>
          <div>
            <dt className="text-ink-400 text-xs">Fornecedor</dt>
            <dd className="text-ink-900 dark:text-white font-medium mt-0.5 capitalize">
              {subscription?.billing_provider ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-400 text-xs">Começou em</dt>
            <dd className="text-ink-900 dark:text-white font-medium mt-0.5">{formatDate(subscription?.current_period_start ?? null)}</dd>
          </div>
          <div>
            <dt className="text-ink-400 text-xs">
              {status === 'canceled' ? 'Termina em' : status === 'trialing' ? 'Teste termina em' : 'Próxima renovação'}
            </dt>
            <dd className="text-ink-900 dark:text-white font-medium mt-0.5">{formatDate(subscription?.current_period_end ?? null)}</dd>
          </div>
        </dl>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {(!isPremium || status === 'canceled' || status === 'expired' || status === 'past_due') && (
            <button type="button" onClick={handleUpgrade} className="btn-primary flex-1 text-sm py-2.5">
              {status === 'trialing' ? 'Manter Premium depois do trial' : 'Fazer upgrade'} <ExternalLink size={14} />
            </button>
          )}
          {isPremium && status === 'active' && subscription?.billing_provider === 'cakto' && (
            <div className="flex-1 text-xs text-ink-500 dark:text-ink-400 rounded-xl border border-ink-200 dark:border-ink-700 px-3.5 py-2.5">
              Para cancelar a renovação automática, acede à área de cliente da Cakto (link enviado por email na
              confirmação da compra) ou contacta o suporte — o cancelamento não é feito aqui para nunca cortar o teu
              acesso sem confirmação.
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 dark:border-ink-800">
          <h2 className="font-display font-semibold text-ink-900 dark:text-white">Histórico de pagamentos</h2>
        </div>
        {loadingHistory ? (
          <div className="flex justify-center py-10">
            <Spinner size={22} />
          </div>
        ) : history.length === 0 ? (
          <EmptyState icon={Clock} title="Sem pagamentos ainda" description="Quando fizeres um pagamento, ele aparece aqui." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-400 border-b border-ink-100 dark:border-ink-800">
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Valor</th>
                  <th className="px-5 py-3 font-medium">Fornecedor</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium">Referência</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-ink-50 dark:border-ink-800/60 last:border-0">
                    <td className="px-5 py-3 text-ink-500 dark:text-ink-400 whitespace-nowrap">{formatDate(h.created_at)}</td>
                    <td className="px-5 py-3 text-ink-900 dark:text-white whitespace-nowrap">
                      {h.amount != null && h.currency ? formatCurrency(h.amount, h.currency) : '—'}
                    </td>
                    <td className="px-5 py-3 text-ink-500 dark:text-ink-400 capitalize">{h.provider}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${BILLING_STATUS_BADGE[h.status]}`}>{BILLING_STATUS_LABEL[h.status] ?? h.status}</span>
                    </td>
                    <td className="px-5 py-3 text-ink-400 text-xs whitespace-nowrap">{h.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
