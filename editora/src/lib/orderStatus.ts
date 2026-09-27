import type { OrderStatus, PaymentStatus } from '../types';

export const orderStatusLabels: Record<OrderStatus, string> = {
  pendente: 'Pendente',
  pagamento_confirmado: 'Pagamento confirmado',
  em_preparacao: 'Em preparação',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  reembolsado: 'Reembolsado',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pendente: 'Pagamento pendente',
  aprovado: 'Pagamento aprovado',
  recusado: 'Pagamento recusado',
  cancelado: 'Pagamento cancelado',
  reembolsado: 'Reembolsado',
};

/** Percurso normal de uma encomenda, usado na linha temporal do cliente. */
export const orderFlow: OrderStatus[] = ['pendente', 'pagamento_confirmado', 'em_preparacao', 'enviado', 'entregue'];

/**
 * Transições permitidas. A mesma tabela existe em SQL
 * (admin_update_order_status) — a base de dados é a autoridade.
 */
const transitions: Record<OrderStatus, OrderStatus[]> = {
  pendente: ['pagamento_confirmado', 'cancelado'],
  pagamento_confirmado: ['em_preparacao', 'cancelado', 'reembolsado'],
  em_preparacao: ['enviado', 'cancelado', 'reembolsado'],
  enviado: ['entregue', 'reembolsado'],
  entregue: ['reembolsado'],
  cancelado: [],
  reembolsado: [],
};

export function allowedTransitions(from: OrderStatus): OrderStatus[] {
  return transitions[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return transitions[from].includes(to);
}

/** Efeito de um evento de pagamento no estado da encomenda (espelha apply_payment_event). */
export function orderStatusAfterPayment(current: OrderStatus, payment: PaymentStatus): OrderStatus {
  switch (payment) {
    case 'aprovado':
      return current === 'pendente' ? 'pagamento_confirmado' : current;
    case 'recusado':
    case 'cancelado':
      return current === 'pendente' ? 'cancelado' : current;
    case 'reembolsado':
      return current === 'cancelado' ? current : 'reembolsado';
    case 'pendente':
      return current;
  }
}

/**
 * Estado do pagamento depois de um novo evento (espelha apply_payment_status).
 * Webhooks podem chegar fora de ordem: um "recusado" atrasado nunca desfaz
 * um pagamento aprovado, e um reembolso é definitivo.
 */
export function nextPaymentStatus(current: PaymentStatus, incoming: PaymentStatus): PaymentStatus {
  if (current === 'reembolsado') return current;
  if (current === 'aprovado' && incoming !== 'reembolsado' && incoming !== 'aprovado') return current;
  return incoming;
}
