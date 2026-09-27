import { describe, expect, it } from 'vitest';
import type { Book, Preorder } from '../types';
import { effectivePrice, getAvailability, getPreorderState, maxPurchasable, remainingUnits } from './preorder';

const now = new Date('2026-10-01T12:00:00Z');

function preorder(overrides: Partial<Preorder> = {}): Preorder {
  return {
    id: 'p1',
    bookId: 'b1',
    enabled: true,
    startsAt: '2026-09-01T00:00:00Z',
    endsAt: '2026-11-01T00:00:00Z',
    unitLimit: 100,
    specialPrice: 9000,
    expectedShipDate: '2026-11-15',
    benefits: [],
    reserved: 10,
    ...overrides,
  };
}

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: 'b1',
    slug: 'livro',
    title: 'Livro',
    subtitle: null,
    authorId: 'a1',
    categoryId: null,
    synopsis: '',
    description: '',
    pages: 200,
    isbn: null,
    publisher: 'Editora',
    publicationDate: '2026-11-15',
    formats: ['capa_mole'],
    price: 12000,
    compareAtPrice: null,
    stock: 0,
    coverUrl: null,
    gallery: [],
    coverColor: '#333',
    published: true,
    isDemo: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getPreorderState', () => {
  it('está aberta dentro da janela e com unidades', () => {
    expect(getPreorderState(preorder(), now)).toBe('aberta');
  });
  it('está em breve antes do início', () => {
    expect(getPreorderState(preorder({ startsAt: '2026-10-05T00:00:00Z' }), now)).toBe('em_breve');
  });
  it('está encerrada depois do fim ou quando desativada', () => {
    expect(getPreorderState(preorder({ endsAt: '2026-09-30T00:00:00Z' }), now)).toBe('encerrada');
    expect(getPreorderState(preorder({ enabled: false }), now)).toBe('encerrada');
  });
  it('está esgotada quando as reservas atingem o limite', () => {
    expect(getPreorderState(preorder({ reserved: 100 }), now)).toBe('esgotada');
  });
  it('sem limite nunca esgota', () => {
    const p = preorder({ unitLimit: null, reserved: 100000 });
    expect(getPreorderState(p, now)).toBe('aberta');
    expect(remainingUnits(p)).toBeNull();
  });
});

describe('disponibilidade e preço', () => {
  it('usa o preço especial só com a pré-venda aberta', () => {
    expect(effectivePrice(book(), preorder(), now)).toBe(9000);
    expect(effectivePrice(book(), preorder({ enabled: false }), now)).toBe(12000);
  });
  it('livro por lançar sem pré-venda aberta aparece como brevemente', () => {
    expect(getAvailability(book(), preorder({ enabled: false }), now)).toBe('brevemente');
    expect(maxPurchasable(book(), preorder({ enabled: false }), now)).toBe(0);
  });
  it('livro lançado depende do stock', () => {
    const released = book({ publicationDate: '2026-01-01', stock: 3 });
    expect(getAvailability(released, undefined, now)).toBe('disponivel');
    expect(maxPurchasable(released, undefined, now)).toBe(3);
    expect(getAvailability({ ...released, stock: 0 }, undefined, now)).toBe('esgotado');
  });
  it('limita a compra às unidades restantes da pré-venda', () => {
    expect(maxPurchasable(book(), preorder({ reserved: 97 }), now)).toBe(3);
  });
});
