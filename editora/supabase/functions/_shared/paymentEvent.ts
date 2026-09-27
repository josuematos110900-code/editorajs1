// Normalização do payload do webhook para o modelo interno. É o ÚNICO
// sítio a adaptar ao formato do provedor de pagamentos escolhido.
//
// Formato genérico esperado:
// {
//   "id": "evt_123",                        // id único do evento (idempotência)
//   "type": "payment.approved",             // ver EVENT_STATUS
//   "data": { "reference": "ED-260927-ABC123", "amount": 23800, "transaction_id": "tx_1" }
// }

export type PaymentStatus = 'pendente' | 'aprovado' | 'recusado' | 'cancelado' | 'reembolsado';

export const EVENT_STATUS: Record<string, PaymentStatus> = {
  'payment.pending': 'pendente',
  'payment.approved': 'aprovado',
  'payment.declined': 'recusado',
  'payment.cancelled': 'cancelado',
  'payment.refunded': 'reembolsado',
};

export interface NormalizedPaymentEvent {
  eventId: string;
  status: PaymentStatus;
  orderNumber: string;
  amount: number | null;
  reference: string | null;
}

export function normalizePaymentEvent(body: unknown): NormalizedPaymentEvent | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const data = (b.data ?? {}) as Record<string, unknown>;
  const status = EVENT_STATUS[String(b.type ?? '')];
  const eventId = typeof b.id === 'string' ? b.id : null;
  const orderNumber = typeof data.reference === 'string' ? data.reference : null;
  if (!status || !eventId || !orderNumber || !/^ED-\d{6}-[A-Z0-9]{5,8}$/.test(orderNumber)) return null;
  const amount = typeof data.amount === 'number' && Number.isInteger(data.amount) ? data.amount : null;
  const reference = typeof data.transaction_id === 'string' ? data.transaction_id.slice(0, 200) : null;
  return { eventId: eventId.slice(0, 200), status, orderNumber, amount, reference };
}
