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

export interface DashboardAlert {
  id: string;
  tone: 'warning' | 'error';
  message: string;
  to: string;
}

/** Alertas acionáveis para a equipa — só o que pede decisão hoje. */
export function computeAlerts(orders: Order[], preorders: Preorder[], books: Book[], now: Date = new Date()): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const title = (id: string) => books.find((b) => b.id === id)?.title ?? 'Livro';

  const stale = orders.filter((o) => o.status === 'pendente' && now.getTime() - new Date(o.createdAt).getTime() > 48 * 3_600_000);
  if (stale.length) alerts.push({ id: 'pagamentos', tone: 'warning', message: `${stale.length} encomenda(s) aguardam pagamento há mais de 48 horas.`, to: '/admin/encomendas?estado=pendente' });

  const toShip = orders.filter((o) => o.status === 'pagamento_confirmado').length;
  if (toShip) alerts.push({ id: 'preparar', tone: 'warning', message: `${toShip} encomenda(s) paga(s) por preparar.`, to: '/admin/encomendas?estado=pagamento_confirmado' });

  for (const p of preorders) {
    if (!p.enabled) continue;
    const endsIn = new Date(p.endsAt).getTime() - now.getTime();
    if (new Date(p.startsAt) <= now && endsIn > 0 && endsIn < 3 * 86_400_000) {
      alerts.push({ id: `fim-${p.id}`, tone: 'warning', message: `A pré-venda de «${title(p.bookId)}» termina em menos de 3 dias.`, to: '/admin/pre-vendas' });
    }
    if (p.unitLimit && p.reserved < p.unitLimit && p.reserved / p.unitLimit >= 0.9) {
      alerts.push({ id: `quase-${p.id}`, tone: 'warning', message: `«${title(p.bookId)}»: ${p.reserved} de ${p.unitLimit} unidades de pré-venda reservadas.`, to: '/admin/pre-vendas' });
    }
  }

  const today = now.toISOString().slice(0, 10);
  for (const b of books) {
    const released = !b.publicationDate || b.publicationDate <= today;
    const inPreorder = preorders.some((p) => p.bookId === b.id && p.enabled && new Date(p.endsAt) > now);
    if (b.published && released && !inPreorder && b.stock <= 5) {
      alerts.push({ id: `stock-${b.id}`, tone: b.stock === 0 ? 'error' : 'warning', message: b.stock === 0 ? `«${b.title}» está esgotado.` : `«${b.title}» tem só ${b.stock} exemplar(es) em stock.`, to: `/admin/livros/${b.id}` });
    }
  }
  return alerts;
}
