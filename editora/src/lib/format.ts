import { site } from '../config/site';

const moneyFormatter = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0, useGrouping: 'always' });

/** 12500 → "12 500 Kz". Os preços são sempre inteiros na moeda da loja. */
export function formatMoney(value: number): string {
  return `${moneyFormatter.format(value)} ${site.currency.symbol}`;
}

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Aceita "AAAA-MM-DD" (tratado como data local) ou ISO completo. */
export function parseDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return dateFormatter.format(parseDate(value));
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return '—';
  return shortDateFormatter.format(parseDate(value));
}

export const formatLabels: Record<string, string> = {
  capa_mole: 'Capa mole',
  capa_dura: 'Capa dura',
  ebook: 'E-book',
  audiolivro: 'Audiolivro',
};
