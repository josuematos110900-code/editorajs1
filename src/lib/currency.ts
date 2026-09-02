import type { CurrencyCode } from '../types/database';

interface CurrencyConfig {
  locale: string;
  symbol: string;
  code: CurrencyCode;
}

// Focado em Angola e Brasil, os dois mercados atuais do FinançasPro.
export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  AOA: { locale: 'pt-AO', symbol: 'Kz', code: 'AOA' },
  BRL: { locale: 'pt-BR', symbol: 'R$', code: 'BRL' },
};

export function formatCurrency(value: number, currency: CurrencyCode = 'AOA'): string {
  const config = CURRENCIES[currency] ?? CURRENCIES.AOA;
  // AOA não tem um formato Intl nativo consistente em todos os browsers,
  // por isso formatamos o número e adicionamos o símbolo manualmente.
  const formattedNumber = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

  if (currency === 'AOA') {
    return `${formattedNumber} Kz`;
  }
  return `R$ ${formattedNumber}`;
}

export function formatCompactCurrency(value: number, currency: CurrencyCode = 'AOA'): string {
  const config = CURRENCIES[currency] ?? CURRENCIES.AOA;
  const compact = new Intl.NumberFormat(config.locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value ?? 0);
  return `${compact} ${config.symbol}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
