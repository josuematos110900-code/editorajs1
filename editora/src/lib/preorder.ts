import type { Book, Preorder, PreorderState } from '../types';

/**
 * Estado público de uma pré-venda num dado instante. A mesma regra existe
 * em SQL (função preorder_state) — a base de dados é quem decide no
 * momento da compra; isto serve para mostrar o estado correto na interface.
 */
export function getPreorderState(preorder: Preorder, now: Date = new Date()): PreorderState {
  if (preorder.unitLimit !== null && preorder.reserved >= preorder.unitLimit) return 'esgotada';
  if (!preorder.enabled) return 'encerrada';
  const start = new Date(preorder.startsAt).getTime();
  const end = new Date(preorder.endsAt).getTime();
  const t = now.getTime();
  if (t < start) return 'em_breve';
  if (t >= end) return 'encerrada';
  return 'aberta';
}

export function remainingUnits(preorder: Preorder): number | null {
  if (preorder.unitLimit === null) return null;
  return Math.max(0, preorder.unitLimit - preorder.reserved);
}

export const preorderStateLabels: Record<PreorderState, string> = {
  em_breve: 'Em breve',
  aberta: 'Aberta',
  encerrada: 'Encerrada',
  esgotada: 'Esgotada',
};

export type Availability = 'pre_venda' | 'disponivel' | 'esgotado' | 'brevemente';

export const availabilityLabels: Record<Availability, string> = {
  pre_venda: 'Em pré-venda',
  disponivel: 'Disponível',
  esgotado: 'Esgotado',
  brevemente: 'Brevemente',
};

/** Disponibilidade de um livro para o catálogo e para o botão de compra. */
export function getAvailability(book: Book, preorder: Preorder | undefined, now: Date = new Date()): Availability {
  if (preorder) {
    const state = getPreorderState(preorder, now);
    if (state === 'aberta') return 'pre_venda';
    if (state === 'em_breve') return 'brevemente';
  }
  const released = !book.publicationDate || new Date(`${book.publicationDate}T00:00:00`).getTime() <= now.getTime();
  if (!released) return 'brevemente';
  return book.stock > 0 ? 'disponivel' : 'esgotado';
}

/** Preço efetivo: preço especial se a pré-venda estiver aberta. */
export function effectivePrice(book: Book, preorder: Preorder | undefined, now: Date = new Date()): number {
  if (preorder && getPreorderState(preorder, now) === 'aberta') return preorder.specialPrice;
  return book.price;
}

/** Máximo que um cliente pode adicionar agora (0 = não pode comprar). */
export function maxPurchasable(book: Book, preorder: Preorder | undefined, now: Date = new Date()): number {
  const availability = getAvailability(book, preorder, now);
  if (availability === 'pre_venda' && preorder) {
    const left = remainingUnits(preorder);
    return left === null ? 10 : Math.min(10, left);
  }
  if (availability === 'disponivel') return Math.min(10, book.stock);
  return 0;
}

/**
 * Benefícios que existem de facto: a poupança calculada, a reserva garantida
 * pelo sistema (as unidades ficam cativas na encomenda) e os benefícios que a
 * equipa definiu para esta campanha. Nunca inventa vantagens genéricas.
 */
export function preorderBenefits(book: Book, preorder: Preorder, formatMoney: (n: number) => string): string[] {
  const list: string[] = [];
  if (preorder.specialPrice < book.price) list.push(`Preço especial: poupa ${formatMoney(book.price - preorder.specialPrice)} por exemplar`);
  list.push('Reserva garantida: o seu exemplar fica guardado assim que encomenda');
  for (const b of preorder.benefits) {
    if (!/pre[çc]o especial|reserva garantida/i.test(b)) list.push(b);
  }
  return list;
}
