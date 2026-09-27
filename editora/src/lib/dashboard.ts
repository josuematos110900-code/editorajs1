import type { Book, Order, Preorder } from '../types';

export interface DashboardStats {
  revenue: number;
  paidOrders: number;
  pendingOrders: number;
  totalOrders: number;
  preorderUnits: number;
  unitsSold: number;
  toShip: number;
  topBooks: { bookId: string; title: string; units: number; revenue: number }[];
  revenueByDay: { date: string; revenue: number }[];
}

const PAID = new Set(['pagamento_confirmado', 'em_preparacao', 'enviado', 'entregue']);

/** Indicadores do painel. Receita = encomendas pagas e não reembolsadas. */
export function computeDashboard(orders: Order[], preorders: Preorder[], _books: Book[], now: Date = new Date(), days = 30): DashboardStats {
  const paid = orders.filter((o) => PAID.has(o.status));
  const byBook = new Map<string, { bookId: string; title: string; units: number; revenue: number }>();
  for (const o of paid) {
    for (const i of o.items) {
      const entry = byBook.get(i.bookId) ?? { bookId: i.bookId, title: i.title, units: 0, revenue: 0 };
      entry.units += i.quantity;
      entry.revenue += i.quantity * i.unitPrice;
      byBook.set(i.bookId, entry);
    }
  }

  const revenueByDay: { date: string; revenue: number }[] = [];
  const index = new Map<string, number>();
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(now.getTime() - d * 86_400_000).toISOString().slice(0, 10);
    index.set(date, revenueByDay.length);
    revenueByDay.push({ date, revenue: 0 });
  }
  for (const o of paid) {
    const i = index.get(o.createdAt.slice(0, 10));
    if (i !== undefined) revenueByDay[i].revenue += o.total;
  }

  return {
    revenue: paid.reduce((s, o) => s + o.total, 0),
    paidOrders: paid.length,
    pendingOrders: orders.filter((o) => o.status === 'pendente').length,
    totalOrders: orders.length,
    preorderUnits: preorders.reduce((s, p) => s + p.reserved, 0),
    unitsSold: [...byBook.values()].reduce((s, b) => s + b.units, 0),
    toShip: orders.filter((o) => o.status === 'pagamento_confirmado' || o.status === 'em_preparacao').length,
    topBooks: [...byBook.values()].sort((a, b) => b.units - a.units).slice(0, 5),
    revenueByDay,
  };
}
