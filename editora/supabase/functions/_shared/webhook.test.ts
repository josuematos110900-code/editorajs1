import { describe, expect, it } from 'vitest';
import { normalizePaymentEvent } from './paymentEvent';
import { signPayload, verifyWebhookSignature } from './signature';

const secret = 'segredo-de-teste';
const body = JSON.stringify({ id: 'evt_1', type: 'payment.approved', data: { reference: 'ED-260927-ABC123', amount: 23800 } });
const now = 1_790_000_000;

describe('verifyWebhookSignature', () => {
  it('aceita uma assinatura válida', async () => {
    const header = await signPayload(secret, body, now);
    expect(await verifyWebhookSignature(header, body, secret, now)).toBe(true);
  });

  it('rejeita corpo alterado, segredo errado ou header malformado', async () => {
    const header = await signPayload(secret, body, now);
    expect(await verifyWebhookSignature(header, body.replace('23800', '1'), secret, now)).toBe(false);
    expect(await verifyWebhookSignature(header, body, 'outro', now)).toBe(false);
    expect(await verifyWebhookSignature('lixo', body, secret, now)).toBe(false);
    expect(await verifyWebhookSignature(null, body, secret, now)).toBe(false);
  });

  it('rejeita assinaturas antigas (replay)', async () => {
    const header = await signPayload(secret, body, now - 3600);
    expect(await verifyWebhookSignature(header, body, secret, now)).toBe(false);
  });
});

describe('normalizePaymentEvent', () => {
  it('converte o evento para o modelo interno', () => {
    expect(normalizePaymentEvent(JSON.parse(body))).toEqual({
      eventId: 'evt_1',
      status: 'aprovado',
      orderNumber: 'ED-260927-ABC123',
      amount: 23800,
      reference: null,
    });
  });

  it('ignora eventos desconhecidos ou incompletos', () => {
    expect(normalizePaymentEvent({ id: 'x', type: 'payout.sent', data: { reference: 'ED-260927-ABC123' } })).toBeNull();
    expect(normalizePaymentEvent({ id: 'x', type: 'payment.approved', data: { reference: "'; drop table orders;--" } })).toBeNull();
    expect(normalizePaymentEvent(null)).toBeNull();
  });
});
