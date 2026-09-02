import type { CurrencyCode } from '../types/database';
import { getCountryFromCurrency, getBillingProvider, type CountryCode, type BillingProviderId } from './plans';

// Link de checkout da Cakto (Brasil, R$ 14,90/mês). Fixo porque é um link
// de produto público da Cakto, não um segredo — o segredo de verdade
// (CAKTO_WEBHOOK_SECRET) só existe server-side, na Edge Function.
const CAKTO_CHECKOUT_URL = 'https://pay.cakto.com.br/vfajkk6_1064672';

// Ainda por criar — assim que existir, cola aqui o link de checkout de
// Angola (Okanda Pay) e o botão de upgrade passa a funcionar sozinho.
// Pode também vir de VITE_OKANDA_CHECKOUT_URL (ver .env.example) sem
// precisar de tocar em código.
const ANGOLA_CHECKOUT_URL: string | null =
  (import.meta.env.VITE_OKANDA_CHECKOUT_URL as string | undefined)?.trim() || null;

interface CheckoutParams {
  currency: CurrencyCode;
  email: string;
  fullName?: string;
}

export interface CheckoutLink {
  url: string;
  provider: BillingProviderId;
}

/**
 * Devolve o link de checkout correto consoante a moeda do utilizador, já com
 * o email pré-preenchido — assim o comprador não arrisca pagar com um email
 * diferente do que usa na conta, o que impediria o webhook de o encontrar.
 * Devolve null quando ainda não há checkout disponível para essa moeda —
 * NUNCA um link vazio (`window.open("")`): quem chama isto deve mostrar
 * uma mensagem de "pagamento temporariamente indisponível" nesse caso,
 * nunca abrir uma janela em branco.
 *
 * Por agora o FinançasPro está focado apenas em Angola (Kz) e Brasil (BRL).
 */
export function getUpgradeCheckoutLink({ currency, email, fullName }: CheckoutParams): CheckoutLink | null {
  const country = getCountryFromCurrency(currency);
  const url = getCheckoutUrl(country, { email, fullName });
  if (!url) return null;
  return { url, provider: getBillingProvider(country) };
}

/**
 * Camada única de checkout — FASE 5. Nenhum componente deve montar URLs
 * de checkout à mão; todos passam por aqui.
 */
export function getCheckoutUrl(country: CountryCode, { email, fullName }: { email?: string; fullName?: string } = {}): string | null {
  if (country === 'BR') {
    const params = new URLSearchParams();
    if (email) {
      params.set('email', email);
      params.set('confirmEmail', email);
    }
    if (fullName) params.set('name', fullName);
    params.set('src', 'financaspro-app');
    return `${CAKTO_CHECKOUT_URL}?${params.toString()}`;
  }

  if (country === 'AO') {
    return ANGOLA_CHECKOUT_URL;
  }

  return null;
}

export { getPlanPrice, getCurrency, getBillingProvider } from './plans';

/** Mensagem profissional a mostrar quando o checkout de um país não está configurado. */
export const CHECKOUT_UNAVAILABLE_MESSAGE: Record<CountryCode, string> = {
  AO: 'O pagamento em Angola está temporariamente indisponível. A nossa equipa já foi notificada — tenta novamente mais tarde.',
  BR: 'O pagamento no Brasil está temporariamente indisponível. A nossa equipa já foi notificada — tenta novamente mais tarde.',
};
