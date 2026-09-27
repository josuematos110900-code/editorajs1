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
const base: CatalogFilters = { q: '', genero: '', autor: '', disponibilidade: '', formato: '', preco: '', ordem: 'recentes' };

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

  it('filtra por formato e por preço efetivo (pré-venda incluída)', () => {
    expect(filterBooks(books, { ...base, formato: 'ebook' }, ctx).map((b) => b.slug).sort()).toEqual(['a-sala-de-aula-viva', 'mares-de-benguela']);
    // «Rios» custa 12 000 mas está em pré-venda a 9 900 → entra no intervalo 8 000–12 000.
    expect(filterBooks(books, { ...base, preco: '8000-12000' }, ctx).map((b) => b.slug)).toContain('rios-que-contam-historias');
    expect(filterBooks(books, { ...base, preco: 'ate-8000' }, ctx).map((b) => b.slug).sort()).toEqual(['o-pequeno-imbondeiro', 'cartas-ao-planalto'].sort());
  });

  it('ordena por lançamento mais recente', () => {
    const result = filterBooks(books, base, ctx);
    const dates = result.map((b) => b.publicationDate!);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});
