import type { CurrencyCode } from '../types/database';

/**
 * Configuração central de planos e preços — FASE 4.
 *
 * Esta é a ÚNICA fonte de verdade para preços no frontend. Nenhum
 * componente (PlanCard, Landing, checkout, subscription, modais,
 * dashboard...) deve ter um preço escrito à mão — todos importam
 * daqui. Mudar o preço do Premium em Angola ou no Brasil é editar
 * este ficheiro, não procurar "3000" ou "14,90" pelo projeto todo.
 *
 * Os limites do plano Free continuam em `planLimits.ts` (não mudam
 * por país) — este ficheiro é só sobre dinheiro: moeda, valor e
 * periodicidade de cobrança.
 */

export type CountryCode = 'AO' | 'BR';
export type BillingInterval = '30d' | 'monthly';
export type BillingProviderId = 'cakto' | 'okanda';

export interface CountryPlanConfig {
  country: CountryCode;
  currency: CurrencyCode;
  premiumPrice: number;
  billingInterval: BillingInterval;
  billingProvider: BillingProviderId;
  /** Texto pronto a mostrar ao utilizador, ex: "3.000 Kz / 30 dias". */
  priceLabel: string;
}

export const TRIAL_DAYS = 14;

export const PLAN_CONFIG: Record<CountryCode, CountryPlanConfig> = {
  AO: {
    country: 'AO',
    currency: 'AOA',
    premiumPrice: 3000,
    billingInterval: '30d',
    billingProvider: 'okanda',
    priceLabel: '3.000 Kz / 30 dias',
  },
  BR: {
    country: 'BR',
    currency: 'BRL',
    premiumPrice: 14.9,
    billingInterval: 'monthly',
    billingProvider: 'cakto',
    priceLabel: 'R$ 14,90 / mês',
  },
};

/** Mapeia a moeda guardada no perfil do utilizador para o país de faturação. */
const CURRENCY_TO_COUNTRY: Record<CurrencyCode, CountryCode> = {
  AOA: 'AO',
  BRL: 'BR',
};

export function getCountryFromCurrency(currency: CurrencyCode | null | undefined): CountryCode {
  return (currency && CURRENCY_TO_COUNTRY[currency]) || 'AO';
}

export function getPlanConfig(countryOrCurrency: CountryCode | CurrencyCode | null | undefined): CountryPlanConfig {
  if (countryOrCurrency === 'AO' || countryOrCurrency === 'BR') {
    return PLAN_CONFIG[countryOrCurrency];
  }
  return PLAN_CONFIG[getCountryFromCurrency(countryOrCurrency as CurrencyCode | null | undefined)];
}

export function getPlanPrice(country: CountryCode): number {
  return PLAN_CONFIG[country].premiumPrice;
}

export function getCurrency(country: CountryCode): CurrencyCode {
  return PLAN_CONFIG[country].currency;
}

export function getBillingProvider(country: CountryCode): BillingProviderId {
  return PLAN_CONFIG[country].billingProvider;
}

export function getPriceLabel(countryOrCurrency: CountryCode | CurrencyCode | null | undefined): string {
  return getPlanConfig(countryOrCurrency).priceLabel;
}
