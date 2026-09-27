import { describe, expect, it } from 'vitest';
import { checkoutSchema, fieldErrors } from './validation';
import { slugify } from './slug';

const valid = {
  customer: { fullName: 'Maria Exemplo', email: 'Maria@Exemplo.ao', phone: '+244 923 000 000' },
  deliveryMethod: 'luanda',
  paymentMethod: 'referencia',
  address: { country: 'Angola', city: 'Luanda', line1: 'Rua Exemplo, 10, Maianga' },
  items: [{ bookId: 'b1', edition: 'fisico' as const, quantity: 1 }],
  acceptTerms: true,
};

describe('checkoutSchema', () => {
  it('aceita um checkout completo e normaliza o e-mail', () => {
    const result = checkoutSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.customer.email).toBe('maria@exemplo.ao');
  });

  it('exige morada quando o método de entrega a pede', () => {
    const result = checkoutSchema.safeParse({ ...valid, address: {} });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)['address.line1']).toBeDefined();
  });

  it('dispensa morada no levantamento', () => {
    expect(checkoutSchema.safeParse({ ...valid, deliveryMethod: 'levantamento', address: {} }).success).toBe(true);
  });

  it('rejeita método de pagamento desativado ou desconhecido', () => {
    expect(checkoutSchema.safeParse({ ...valid, paymentMethod: 'bitcoin' }).success).toBe(false);
  });

  it('carrinho só digital usa entrega digital e dispensa morada', () => {
    const digital = { ...valid, items: [{ bookId: 'b1', edition: 'ebook' as const, quantity: 1 }], address: {} };
    expect(checkoutSchema.safeParse({ ...digital, deliveryMethod: 'digital' }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...digital, deliveryMethod: 'luanda' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, deliveryMethod: 'digital' }).success).toBe(false);
  });

  it('rejeita quantidades inválidas e carrinho vazio', () => {
    expect(checkoutSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, items: [{ bookId: 'b1', edition: 'fisico', quantity: 0 }] }).success).toBe(false);
  });
});

describe('slugify', () => {
  it('gera URLs amigáveis', () => {
    expect(slugify('O Segredo da Última Noite')).toBe('o-segredo-da-ultima-noite');
    expect(slugify('  Ação & Reação!  ')).toBe('acao-reacao');
  });
});

describe('formatMoney', () => {
  it('agrupa sempre os milhares, também com 4 dígitos', async () => {
    const { formatMoney } = await import('./format');
    expect(formatMoney(9900).replace(/\s/g, ' ')).toBe('9 900 Kz');
    expect(formatMoney(14500).replace(/\s/g, ' ')).toBe('14 500 Kz');
  });
});
