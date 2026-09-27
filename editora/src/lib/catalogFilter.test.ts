import { describe, expect, it } from 'vitest';
import { buildDemoCatalog } from '../data/demoSeed';
import { filterBooks, type CatalogFilters } from './catalogFilter';

const now = new Date('2026-10-01T12:00:00Z');
const catalog = buildDemoCatalog(now.getTime());
const books = catalog.books.filter((b) => b.published);
const ctx = {
  authors: catalog.authors,
  categorySlugToId: new Map(catalog.categories.map((c) => [c.slug, c.id])),
  preorderFor: (id: string) => catalog.preorders.find((p) => p.bookId === id),
  now,
};
const base: CatalogFilters = { q: '', genero: '', autor: '', disponibilidade: '', ordem: 'recentes' };

describe('filterBooks', () => {
  it('pesquisa sem acentos por título e autor', () => {
    expect(filterBooks(books, { ...base, q: 'ultima noite' }, ctx).map((b) => b.slug)).toEqual(['o-segredo-da-ultima-noite']);
    expect(filterBooks(books, { ...base, q: 'quissanga' }, ctx)).toHaveLength(2);
  });

  it('filtra por género, autor e disponibilidade', () => {
    expect(filterBooks(books, { ...base, genero: 'romance' }, ctx)).toHaveLength(2);
    expect(filterBooks(books, { ...base, autor: 'ndalu-kiala' }, ctx)).toHaveLength(2);
    expect(filterBooks(books, { ...base, disponibilidade: 'pre_venda' }, ctx).map((b) => b.slug).sort()).toEqual([
      'o-segredo-da-ultima-noite',
      'rios-que-contam-historias',
    ]);
  });

  it('ordena por lançamento mais recente', () => {
    const result = filterBooks(books, base, ctx);
    const dates = result.map((b) => b.publicationDate!);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});
