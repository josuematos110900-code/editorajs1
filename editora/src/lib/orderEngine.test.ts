import { describe, expect, it } from 'vitest';
import { buildDemoCatalog } from '../data/demoSeed';
import { OrderRejected, generateOrderNumber, priceOrder } from './orderEngine';

const now = new Date('2026-10-01T12:00:00Z');
const { books, preorders, digitalFiles } = buildDemoCatalog(now.getTime());

describe('priceOrder', () => {
  it('usa o preço especial da pré-venda aberta e mostra a poupança', () => {
    const order = priceOrder([{ bookId: 'bk-segredo', edition: 'fisico', quantity: 2 }], 'levantamento', books, preorders, now);
    expect(order.items[0]).toMatchObject({ unitPrice: 11900, isPreorder: true });
    expect(order.totals).toEqual({ subtotal: 29000, discount: 5200, shipping: 0, total: 23800 });
  });

  it('junta linhas repetidas do mesmo livro', () => {
    const order = priceOrder(
      [
        { bookId: 'bk-sala', edition: 'fisico', quantity: 1 },
        { bookId: 'bk-sala', edition: 'fisico', quantity: 2 },
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
    expect(() => priceOrder([{ bookId: 'bk-rios', edition: 'fisico', quantity: 10 }, { bookId: 'bk-rios', edition: 'fisico', quantity: 10 }], 'luanda', books, preorders, now)).toThrow(
      OrderRejected,
    );
  });

  it('explica que a pré-venda esgotou a quem chega depois da última unidade', () => {
    const full = preorders.map((p) => (p.id === 'pre-rios' ? { ...p, reserved: 150 } : p));
    expect(() => priceOrder([{ bookId: 'bk-rios', edition: 'fisico', quantity: 1 }], 'luanda', books, full, now)).toThrow(/esgotou/);
  });

  it('recusa livros esgotados, por lançar ou não publicados', () => {
    expect(() => priceOrder([{ bookId: 'bk-provincias', edition: 'fisico', quantity: 1 }], 'luanda', books, preorders, now)).toThrow(OrderRejected);
    expect(() => priceOrder([{ bookId: 'bk-imbondeiro', edition: 'fisico', quantity: 1 }], 'luanda', books, preorders, now)).toThrow(OrderRejected);
    expect(() => priceOrder([{ bookId: 'bk-mapas', edition: 'fisico', quantity: 1 }], 'luanda', books, preorders, now)).toThrow(OrderRejected);
  });

  it('recusa mais exemplares do que o stock', () => {
    expect(() => priceOrder([{ bookId: 'bk-cartas', edition: 'fisico', quantity: 4 }], 'luanda', books, preorders, now)).toThrow(/Restam apenas 3/);
  });
});

describe('edições digitais', () => {
  const buy = (lines: Parameters<typeof priceOrder>[0], method: string, owned = new Set<string>()) =>
    priceOrder(lines, method, books, preorders, now, digitalFiles, owned);

  it('vende e-book e audiolivro sem portes nem morada', () => {
    const order = buy(
      [
        { bookId: 'bk-mares', edition: 'ebook', quantity: 1 },
        { bookId: 'bk-mares', edition: 'audiolivro', quantity: 1 },
      ],
      'digital',
    );
    expect(order.items.map((i) => [i.edition, i.unitPrice])).toEqual([
      ['ebook', 6500],
      ['audiolivro', 7900],
    ]);
    expect(order.totals).toEqual({ subtotal: 14400, discount: 0, shipping: 0, total: 14400 });
  });

  it('numa encomenda mista, os portes só contam o livro físico', () => {
    // Físico 9 500 (< 30 000, paga portes de Luanda) + e-book 6 500.
    const order = buy(
      [
        { bookId: 'bk-sala', edition: 'fisico', quantity: 1 },
        { bookId: 'bk-mares', edition: 'ebook', quantity: 1 },
      ],
      'luanda',
    );
    expect(order.totals).toEqual({ subtotal: 16000, discount: 0, shipping: 2500, total: 18500 });
  });

  it('exige a entrega certa para cada tipo de carrinho', () => {
    expect(() => buy([{ bookId: 'bk-mares', edition: 'ebook', quantity: 1 }], 'luanda')).toThrow(/entrega física/);
    expect(() => buy([{ bookId: 'bk-sala', edition: 'fisico', quantity: 1 }], 'digital')).toThrow(/livros físicos/);
  });

  it('não deixa comprar duas vezes, nem mais de um exemplar digital', () => {
    expect(() => buy([{ bookId: 'bk-mares', edition: 'ebook', quantity: 2 }], 'digital')).toThrow(/uma vez/);
    expect(() => buy([{ bookId: 'bk-mares', edition: 'ebook', quantity: 1 }], 'digital', new Set(['bk-mares:ebook']))).toThrow(/biblioteca/);
  });

  it('recusa edições digitais sem ficheiro, sem preço ou de livros por lançar', () => {
    expect(() => buy([{ bookId: 'bk-segredo', edition: 'ebook', quantity: 1 }], 'digital')).toThrow(/não está disponível/);
    const noFiles = () => priceOrder([{ bookId: 'bk-sala', edition: 'ebook', quantity: 1 }], 'digital', books, preorders, now, []);
    expect(noFiles).toThrow(/não está disponível/);
  });

  it('o audiolivro de um livro esgotado em papel continua à venda', () => {
    const soldOut = books.map((b) => (b.id === 'bk-cartas' ? { ...b, stock: 0 } : b));
    const order = priceOrder([{ bookId: 'bk-cartas', edition: 'audiolivro', quantity: 1 }], 'digital', soldOut, preorders, now, digitalFiles);
    expect(order.totals.total).toBe(4500);
  });
});

describe('generateOrderNumber', () => {
  it('gera números legíveis com data', () => {
    expect(generateOrderNumber(now, () => 0)).toBe('ED-261001-AAAAA');
  });
});
