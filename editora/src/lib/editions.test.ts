import { describe, expect, it } from 'vitest';
import { buildDemoCatalog } from '../data/demoSeed';
import { cardAvailability, cardPrice, editionOffers, formatDuration } from './editions';

const now = new Date('2026-10-01T12:00:00Z');
const { books, preorders, digitalFiles } = buildDemoCatalog(now.getTime());
const book = (id: string) => books.find((b) => b.id === id)!;
const pre = (id: string) => preorders.find((p) => p.bookId === id);

describe('edições', () => {
  it('lista as edições à venda com o respetivo preço', () => {
    expect(editionOffers(book('bk-mares'), undefined, digitalFiles, now).map((o) => [o.edition, o.price])).toEqual([
      ['fisico', 10500],
      ['ebook', 6500],
      ['audiolivro', 7900],
    ]);
  });

  it('livro em pré-venda: só a edição física, com o preço especial', () => {
    expect(editionOffers(book('bk-segredo'), pre('bk-segredo'), digitalFiles, now)).toEqual([
      { edition: 'fisico', price: 11900, listPrice: 14500, max: 10, isPreorder: true },
    ]);
  });

  it('esgotado em papel mas com audiolivro continua disponível, a partir do preço digital', () => {
    const cartas = { ...book('bk-cartas'), stock: 0 };
    expect(cardAvailability(cartas, undefined, digitalFiles, now)).toBe('disponivel');
    expect(cardPrice(cartas, undefined, digitalFiles, now)).toEqual({ value: 4500, from: false });
    expect(cardAvailability(cartas, undefined, [], now)).toBe('esgotado');
  });

  it('livro só digital, por lançar, aparece como brevemente', () => {
    const digitalOnly = { ...book('bk-mares'), formats: [], publicationDate: '2027-01-01' };
    expect(cardAvailability(digitalOnly, undefined, digitalFiles, now)).toBe('brevemente');
  });

  it('formata a duração do audiolivro', () => {
    expect(formatDuration(412)).toBe('6 h 52 min');
    expect(formatDuration(58)).toBe('58 min');
  });
});
