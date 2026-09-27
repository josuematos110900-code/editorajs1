import { describe, expect, it } from 'vitest';
import { deliveryMethods } from '../config/site';
import { computeTotals, shippingCost } from './pricing';

const luanda = deliveryMethods.find((m) => m.id === 'luanda')!;
const pickup = deliveryMethods.find((m) => m.id === 'levantamento')!;

describe('computeTotals', () => {
  it('soma subtotal, desconto de pré-venda e portes', () => {
    const totals = computeTotals(
      [
        { unitPrice: 9000, listPrice: 12000, quantity: 2 },
        { unitPrice: 5000, listPrice: 5000, quantity: 1 },
      ],
      luanda,
    );
    expect(totals).toEqual({ subtotal: 29000, discount: 6000, shipping: 2500, total: 25500 });
  });

  it('aplica portes grátis acima do limite', () => {
    expect(shippingCost(luanda, 30000)).toBe(0);
    expect(shippingCost(luanda, 29999)).toBe(2500);
  });

  it('levantamento não tem portes', () => {
    expect(computeTotals([{ unitPrice: 1000, listPrice: 1000, quantity: 1 }], pickup).total).toBe(1000);
  });
});
