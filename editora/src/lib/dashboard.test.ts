import { describe, expect, it } from 'vitest';
import type { Order, OrderStatus } from '../types';
import { computeDashboard } from './dashboard';

const now = new Date('2026-10-01T12:00:00Z');

function order(id: string, status: OrderStatus, total: number, items: [string, number, number][]): Order {
  return {
    id,
    number: id,
    userId: 'u',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: { country: '', city: '', line1: '' },
    deliveryMethod: 'luanda',
    items: items.map(([bookId, quantity, unitPrice]) => ({ id: `${id}-${bookId}`, bookId, title: bookId, quantity, unitPrice, listPrice: unitPrice, isPreorder: false })),
    subtotal: total,
    shippingCost: 0,
    discount: 0,
    total,
    status,
    payment: { id: '', method: 'referencia', status: 'aprovado', amount: total, providerReference: null, updatedAt: '' },
    createdAt: '2026-09-30T10:00:00Z',
  };
}

describe('computeDashboard', () => {
  it('conta receita só de encomendas pagas e ordena os mais vendidos', () => {
    const stats = computeDashboard(
      [
        order('a', 'pagamento_confirmado', 20000, [['x', 2, 10000]]),
        order('b', 'entregue', 5000, [['y', 1, 5000]]),
        order('c', 'pendente', 9999, [['y', 5, 2000]]),
        order('d', 'reembolsado', 7000, [['y', 7, 1000]]),
      ],
      [],
      [],
      now,
    );
    expect(stats.revenue).toBe(25000);
    expect(stats.paidOrders).toBe(2);
    expect(stats.pendingOrders).toBe(1);
    expect(stats.toShip).toBe(1);
    expect(stats.topBooks.map((b) => b.bookId)).toEqual(['x', 'y']);
    expect(stats.revenueByDay.at(-2)).toEqual({ date: '2026-09-30', revenue: 25000 });
  });
});
