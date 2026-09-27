import { deliveryMethods } from '../config/site';
import type { Book, OrderItem, Preorder } from '../types';
import { getAvailability, getPreorderState, remainingUnits } from './preorder';
import { computeTotals, type Totals } from './pricing';

export interface PricedOrder {
  items: (Omit<OrderItem, 'id'> & { listPrice: number })[];
  totals: Totals;
}

export class OrderRejected extends Error {}

/**
 * Valida e precifica uma encomenda contra o catálogo atual. É a versão
 * TypeScript da função SQL place_order — usada no modo demonstração e nos
 * testes. Em produção quem decide é a base de dados.
 */
export function priceOrder(
  lines: { bookId: string; quantity: number }[],
  deliveryMethodId: string,
  books: Book[],
  preorders: Preorder[],
  now: Date = new Date(),
): PricedOrder {
  const merged = new Map<string, number>();
  for (const line of lines) merged.set(line.bookId, (merged.get(line.bookId) ?? 0) + line.quantity);

  const method = deliveryMethods.find((m) => m.id === deliveryMethodId);
  if (!method) throw new OrderRejected('Método de entrega inválido.');

  const items: PricedOrder['items'] = [];
  for (const [bookId, quantity] of merged) {
    const book = books.find((b) => b.id === bookId && b.published);
    if (!book) throw new OrderRejected('Um dos livros do carrinho já não está disponível.');
    if (quantity < 1 || quantity > 10) throw new OrderRejected('Quantidade inválida (máximo 10 por livro).');

    const preorder = preorders.find((p) => p.bookId === bookId);
    if (preorder && getPreorderState(preorder, now) === 'aberta') {
      const left = remainingUnits(preorder);
      if (left !== null && quantity > left) {
        throw new OrderRejected(`Restam apenas ${left} unidade(s) em pré-venda de «${book.title}».`);
      }
      items.push({ bookId, title: book.title, quantity, unitPrice: preorder.specialPrice, listPrice: book.price, isPreorder: true });
      continue;
    }

    if (getAvailability(book, preorder, now) !== 'disponivel') {
      throw new OrderRejected(`«${book.title}» não está disponível para compra neste momento.`);
    }
    if (quantity > book.stock) {
      throw new OrderRejected(`Restam apenas ${book.stock} exemplar(es) de «${book.title}».`);
    }
    items.push({ bookId, title: book.title, quantity, unitPrice: book.price, listPrice: book.price, isPreorder: false });
  }

  return { items, totals: computeTotals(items, method) };
}

/** Número de encomenda legível: ED-260927-7F3KQ */
export function generateOrderNumber(now: Date = new Date(), random: () => number = Math.random): string {
  const date = now.toISOString().slice(2, 10).replace(/-/g, '');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) suffix += alphabet[Math.floor(random() * alphabet.length)];
  return `ED-${date}-${suffix}`;
}
