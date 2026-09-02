import type { CurrencyCode } from '../types/database';

// Link de checkout da Cakto (Brasil, R$ 14,90/mês).
const CAKTO_CHECKOUT_URL = 'https://pay.cakto.com.br/vfajkk6_1064672';

// Ainda por criar — assim que existir, cola aqui o link de checkout de
// Angola (Okanda Pay) e o botão de upgrade passa a funcionar sozinho.
const ANGOLA_CHECKOUT_URL: string | null = null;

interface CheckoutParams {
  currency: CurrencyCode;
  email: string;
  fullName?: string;
}

export interface CheckoutLink {
  url: string;
  provider: 'cakto' | 'angola';
}

/**
 * Devolve o link de checkout correto consoante a moeda do utilizador, já com
 * o email pré-preenchido — assim o comprador não arrisca pagar com um email
 * diferente do que usa na conta, o que impediria o webhook de o encontrar.
 * Devolve null quando ainda não há checkout disponível para essa moeda.
 *
 * Por agora o FinançasPro está focado apenas em Angola (Kz) e Brasil (BRL).
 */
export function getUpgradeCheckoutLink({ currency, email, fullName }: CheckoutParams): CheckoutLink | null {
  if (currency === 'BRL') {
    const params = new URLSearchParams();
    if (email) {
      params.set('email', email);
      params.set('confirmEmail', email);
    }
    if (fullName) params.set('name', fullName);
    params.set('src', 'financaspro-app');
    return { url: `${CAKTO_CHECKOUT_URL}?${params.toString()}`, provider: 'cakto' };
  }

  if (currency === 'AOA') {
    if (!ANGOLA_CHECKOUT_URL) return null;
    return { url: ANGOLA_CHECKOUT_URL, provider: 'angola' };
  }

  return null;
}
