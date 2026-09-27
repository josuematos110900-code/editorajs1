import { digitalDelivery, findDeliveryMethod } from '../config/site';
import type { Book, DigitalFile, Edition, OrderItem, Preorder } from '../types';
import { digitalAvailable, digitalPrice, editionLabels, hasPhysical, isDigital } from './editions';
import { getAvailability, getPreorderState, remainingUnits } from './preorder';
import { computeTotals, type Totals } from './pricing';

export interface PricedOrder {
  items: (Omit<OrderItem, 'id'> & { listPrice: number })[];
  totals: Totals;
}

export class OrderRejected extends Error {}

export interface OrderLine {
  bookId: string;
  edition: Edition;
  quantity: number;
}

/**
 * Valida e precifica uma encomenda contra o catálogo atual. É a versão
 * TypeScript da função SQL place_order — usada no modo demonstração e nos
 * testes. Em produção quem decide é a base de dados.
 *
 * `owned` = edições digitais que o cliente já comprou (formato "livro:tipo"),
 * para não cobrar duas vezes o mesmo e-book/audiolivro.
 */
export function priceOrder(
  lines: OrderLine[],
  deliveryMethodId: string,
  books: Book[],
  preorders: Preorder[],
  now: Date = new Date(),
  files: DigitalFile[] = [],
  owned: Set<string> = new Set(),
): PricedOrder {
  const merged = new Map<string, OrderLine>();
  for (const line of lines) {
    const key = `${line.bookId}:${line.edition}`;
    const prev = merged.get(key);
    merged.set(key, { ...line, quantity: (prev?.quantity ?? 0) + line.quantity });
  }

  const method = findDeliveryMethod(deliveryMethodId);
  if (!method) throw new OrderRejected('Método de entrega inválido.');
  const hasPhysicalLine = [...merged.values()].some((l) => l.edition === 'fisico');
  if (hasPhysicalLine && method.id === digitalDelivery.id) throw new OrderRejected('Escolha como quer receber os livros físicos.');
  if (!hasPhysicalLine && method.id !== digitalDelivery.id) throw new OrderRejected('Os livros digitais não têm entrega física.');

  const items: PricedOrder['items'] = [];
  for (const { bookId, edition, quantity } of merged.values()) {
    const book = books.find((b) => b.id === bookId && b.published);
    if (!book) throw new OrderRejected('Um dos livros do carrinho já não está disponível.');
    if (quantity < 1 || quantity > 10) throw new OrderRejected('Quantidade inválida (máximo 10 por livro).');

    if (isDigital(edition)) {
      const label = editionLabels[edition].toLowerCase();
      if (quantity !== 1) throw new OrderRejected(`O ${label} de «${book.title}» compra-se uma vez por conta.`);
      if (!digitalAvailable(book, edition, files, now)) throw new OrderRejected(`O ${label} de «${book.title}» não está disponível.`);
      if (owned.has(`${bookId}:${edition}`)) throw new OrderRejected(`Já comprou o ${label} de «${book.title}» — está na sua biblioteca.`);
      const price = digitalPrice(book, edition)!;
      items.push({ bookId, title: book.title, quantity: 1, unitPrice: price, listPrice: price, isPreorder: false, edition });
      continue;
    }

    if (!hasPhysical(book)) throw new OrderRejected(`«${book.title}» não tem edição impressa.`);
    const preorder = preorders.find((p) => p.bookId === bookId);
    if (preorder && getPreorderState(preorder, now) === 'aberta') {
      const left = remainingUnits(preorder);
      if (left !== null && quantity > left) {
        throw new OrderRejected(`Restam apenas ${left} unidade(s) em pré-venda de «${book.title}».`);
      }
      items.push({ bookId, title: book.title, quantity, unitPrice: preorder.specialPrice, listPrice: book.price, isPreorder: true, edition });
      continue;
    }

    if (preorder && getPreorderState(preorder, now) === 'esgotada') {
      throw new OrderRejected(`A pré-venda de «${book.title}» esgotou — todos os exemplares foram reservados.`);
    }
    if (getAvailability(book, preorder, now) !== 'disponivel') {
      throw new OrderRejected(`«${book.title}» não está disponível para compra neste momento.`);
    }
    if (quantity > book.stock) {
      throw new OrderRejected(`Restam apenas ${book.stock} exemplar(es) de «${book.title}».`);
    }
    items.push({ bookId, title: book.title, quantity, unitPrice: book.price, listPrice: book.price, isPreorder: false, edition });
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
