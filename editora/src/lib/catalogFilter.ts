import type { Author, Book, BookFormat, Preorder } from '../types';
import { getAvailability, effectivePrice, type Availability } from './preorder';

export type SortKey = 'recentes' | 'antigos' | 'titulo' | 'preco_asc' | 'preco_desc';

export interface CatalogFilters {
  q: string;
  genero: string; // slug da categoria ou ''
  autor: string; // slug do autor ou ''
  disponibilidade: Availability | '';
  formato: BookFormat | '';
  preco: PriceRange | '';
  ordem: SortKey;
}

export type PriceRange = 'ate-8000' | '8000-12000' | '12000-mais';

export const priceRanges: Record<PriceRange, { label: string; min: number; max: number }> = {
  'ate-8000': { label: 'Até 8 000 Kz', min: 0, max: 8000 },
  '8000-12000': { label: '8 001 – 12 000 Kz', min: 8001, max: 12000 },
  '12000-mais': { label: 'Mais de 12 000 Kz', min: 12001, max: Number.POSITIVE_INFINITY },
};

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Pesquisa, filtros e ordenação do catálogo (puro, testado). */
export function filterBooks(
  books: Book[],
  filters: CatalogFilters,
  ctx: { authors: Author[]; categorySlugToId: Map<string, string>; preorderFor: (id: string) => Preorder | undefined; now?: Date },
): Book[] {
  const q = normalize(filters.q.trim());
  const authorName = new Map(ctx.authors.map((a) => [a.id, a.name]));
  const authorId = filters.autor ? ctx.authors.find((a) => a.slug === filters.autor)?.id : undefined;
  const categoryId = filters.genero ? ctx.categorySlugToId.get(filters.genero) : undefined;

  const result = books.filter((b) => {
    if (filters.autor && b.authorId !== authorId) return false;
    if (filters.genero && b.categoryId !== categoryId) return false;
    if (filters.disponibilidade && getAvailability(b, ctx.preorderFor(b.id), ctx.now) !== filters.disponibilidade) return false;
    if (filters.formato && !b.formats.includes(filters.formato)) return false;
    if (filters.preco) {
      const range = priceRanges[filters.preco];
      const p = effectivePrice(b, ctx.preorderFor(b.id), ctx.now);
      if (!range || p < range.min || p > range.max) return false;
    }
    if (q) {
      const haystack = normalize([b.title, b.subtitle ?? '', authorName.get(b.authorId) ?? '', b.isbn ?? ''].join(' '));
      if (!q.split(/\s+/).every((term) => haystack.includes(term))) return false;
    }
    return true;
  });

  const date = (b: Book) => b.publicationDate ?? '9999-12-31';
  const price = (b: Book) => effectivePrice(b, ctx.preorderFor(b.id), ctx.now);
  const sorters: Record<SortKey, (a: Book, b: Book) => number> = {
    recentes: (a, b) => date(b).localeCompare(date(a)),
    antigos: (a, b) => date(a).localeCompare(date(b)),
    titulo: (a, b) => a.title.localeCompare(b.title, 'pt'),
    preco_asc: (a, b) => price(a) - price(b),
    preco_desc: (a, b) => price(b) - price(a),
  };
  return result.sort(sorters[filters.ordem] ?? sorters.recentes);
}
