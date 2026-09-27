import { describe, expect, it } from 'vitest';
import { buildDemoCatalog } from '../data/demoSeed';
import { OrderRejected, generateOrderNumber, priceOrder } from './orderEngine';

const now = new Date('2026-10-01T12:00:00Z');
const { books, preorders } = buildDemoCatalog(now.getTime());

describe('priceOrder', () => {
  it('usa o preço especial da pré-venda aberta e mostra a poupança', () => {
    const order = priceOrder([{ bookId: 'bk-segredo', quantity: 2 }], 'levantamento', books, preorders, now);
    expect(order.items[0]).toMatchObject({ unitPrice: 11900, isPreorder: true });
    expect(order.totals).toEqual({ subtotal: 29000, discount: 5200, shipping: 0, total: 23800 });
  });

  it('junta linhas repetidas do mesmo livro', () => {
    const order = priceOrder(
      [
        { bookId: 'bk-sala', quantity: 1 },
        { bookId: 'bk-sala', quantity: 2 },
      ],
      'levantamento',
      books,
      preorders,
      now,
    );
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(3);
  });

  it('recusa mais unidades do que as restantes na pré-venda', () => {
    // Pré-venda "rios": limite 150, 131 reservadas → restam 19.
    expect(() => priceOrder([{ bookId: 'bk-rios', quantity: 10 }, { bookId: 'bk-rios', quantity: 10 }], 'luanda', books, preorders, now)).toThrow(
      OrderRejected,
    );
  });

  it('recusa livros esgotados, por lançar ou não publicados', () => {
    expect(() => priceOrder([{ bookId: 'bk-provincias', quantity: 1 }], 'luanda', books, preorders, now)).toThrow(OrderRejected);
    expect(() => priceOrder([{ bookId: 'bk-imbondeiro', quantity: 1 }], 'luanda', books, preorders, now)).toThrow(OrderRejected);
    expect(() => priceOrder([{ bookId: 'bk-mapas', quantity: 1 }], 'luanda', books, preorders, now)).toThrow(OrderRejected);
  });

  it('recusa mais exemplares do que o stock', () => {
    expect(() => priceOrder([{ bookId: 'bk-cartas', quantity: 4 }], 'luanda', books, preorders, now)).toThrow(/Restam apenas 3/);
  });
});

describe('generateOrderNumber', () => {
  it('gera números legíveis com data', () => {
    expect(generateOrderNumber(now, () => 0)).toBe('ED-261001-AAAAA');
  });
});
