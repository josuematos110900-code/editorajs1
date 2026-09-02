import { describe, expect, it } from 'vitest';
import { hasActivePremium } from './premium';
import type { Subscription } from '../types/database';

function sub(overrides: Partial<Subscription>): Subscription {
  return {
    id: '1',
    user_id: 'u1',
    plan: 'free',
    status: 'active',
    country: null,
    currency: null,
    billing_provider: null,
    provider_customer_id: null,
    provider_subscription_id: null,
    provider_product_id: null,
    current_period_start: null,
    current_period_end: null,
    auto_renew: true,
    canceled_at: null,
    trial_reminder_sent: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('hasActivePremium', () => {
  it('free plan nunca é Premium', () => {
    expect(hasActivePremium(sub({ plan: 'free', status: 'active' }))).toBe(false);
  });

  it('trialing dentro do prazo é Premium', () => {
    expect(hasActivePremium(sub({ plan: 'premium', status: 'trialing', current_period_end: daysFromNow(5) }))).toBe(true);
  });

  it('active sem data-fim é Premium', () => {
    expect(hasActivePremium(sub({ plan: 'premium', status: 'active', current_period_end: null }))).toBe(true);
  });

  it('canceled dentro do período pago continua Premium', () => {
    expect(hasActivePremium(sub({ plan: 'premium', status: 'canceled', current_period_end: daysFromNow(3) }))).toBe(true);
  });

  it('canceled depois do período pago deixa de ser Premium', () => {
    expect(hasActivePremium(sub({ plan: 'premium', status: 'canceled', current_period_end: daysFromNow(-1) }))).toBe(false);
  });

  it('past_due nunca é Premium, mesmo com data-fim futura', () => {
    expect(hasActivePremium(sub({ plan: 'premium', status: 'past_due', current_period_end: daysFromNow(10) }))).toBe(false);
  });

  it('expired nunca é Premium', () => {
    expect(hasActivePremium(sub({ plan: 'premium', status: 'expired', current_period_end: daysFromNow(-30) }))).toBe(false);
  });

  it('sem subscription é Free', () => {
    expect(hasActivePremium(null)).toBe(false);
  });
});
