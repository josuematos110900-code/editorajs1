import type { Book, DigitalFile, DigitalKind, Edition, Preorder } from '../types';
import { effectivePrice, getAvailability, maxPurchasable, type Availability } from './preorder';

export const editionLabels: Record<Edition, string> = {
  fisico: 'Livro físico',
  ebook: 'E-book',
  audiolivro: 'Audiolivro',
};

export const DIGITAL_KINDS: DigitalKind[] = ['ebook', 'audiolivro'];

export function isDigital(edition: Edition): edition is DigitalKind {
  return edition !== 'fisico';
}

/** O livro tem edição impressa (capa mole ou dura)? */
export function hasPhysical(book: Book): boolean {
  return book.formats.some((f) => f === 'capa_mole' || f === 'capa_dura');
}

export function isReleased(book: Book, now: Date = new Date()): boolean {
  return !book.publicationDate || new Date(`${book.publicationDate}T00:00:00`).getTime() <= now.getTime();
}

export function digitalPrice(book: Book, kind: DigitalKind): number | null {
  return kind === 'ebook' ? book.ebookPrice : book.audiobookPrice;
}

/**
 * Uma edição digital está à venda quando: tem preço, o livro já foi lançado
 * e existe pelo menos um ficheiro carregado. Espelha a verificação em
 * place_order (a base de dados é quem decide).
 */
export function digitalAvailable(book: Book, kind: DigitalKind, files: DigitalFile[], now: Date = new Date()): boolean {
  return (
    book.published &&
    digitalPrice(book, kind) !== null &&
    isReleased(book, now) &&
    files.some((f) => f.bookId === book.id && f.kind === kind)
  );
}

export interface EditionOffer {
  edition: Edition;
  price: number;
  listPrice: number;
  /** Máximo por compra (digitais: 1). 0 = não se pode comprar agora. */
  max: number;
  isPreorder: boolean;
}

/** Edições que se podem comprar agora, com preço. */
export function editionOffers(book: Book, preorder: Preorder | undefined, files: DigitalFile[], now: Date = new Date()): EditionOffer[] {
  const offers: EditionOffer[] = [];
  if (hasPhysical(book)) {
    const max = maxPurchasable(book, preorder, now);
    if (max > 0) {
      offers.push({
        edition: 'fisico',
        price: effectivePrice(book, preorder, now),
        listPrice: book.price,
        max,
        isPreorder: getAvailability(book, preorder, now) === 'pre_venda',
      });
    }
  }
  for (const kind of DIGITAL_KINDS) {
    const price = digitalPrice(book, kind);
    if (price !== null && digitalAvailable(book, kind, files, now)) {
      offers.push({ edition: kind, price, listPrice: price, max: 1, isPreorder: false });
    }
  }
  return offers;
}

/**
 * Disponibilidade mostrada nos cartões e usada no filtro do catálogo: um
 * livro esgotado em papel mas com e-book ou audiolivro continua «Disponível».
 */
export function cardAvailability(book: Book, preorder: Preorder | undefined, files: DigitalFile[], now: Date = new Date()): Availability {
  const physical = hasPhysical(book) ? getAvailability(book, preorder, now) : 'esgotado';
  if (physical === 'pre_venda' || physical === 'disponivel') return physical;
  if (DIGITAL_KINDS.some((k) => digitalAvailable(book, k, files, now))) return 'disponivel';
  if (!hasPhysical(book) && !isReleased(book, now)) return 'brevemente';
  return physical;
}

/** Preço a mostrar no cartão: o do livro físico, ou «desde» o digital mais barato. */
export function cardPrice(book: Book, preorder: Preorder | undefined, files: DigitalFile[], now: Date = new Date()): { value: number; from: boolean } {
  const offers = editionOffers(book, preorder, files, now);
  const physical = offers.find((o) => o.edition === 'fisico');
  if (physical) return { value: physical.price, from: false };
  if (offers.length) return { value: Math.min(...offers.map((o) => o.price)), from: offers.length > 1 };
  return { value: hasPhysical(book) ? effectivePrice(book, preorder, now) : (book.ebookPrice ?? book.audiobookPrice ?? book.price), from: false };
}

export function formatDuration(minutes: number | null): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}
