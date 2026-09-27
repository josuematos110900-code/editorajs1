import type { DeliveryMethod } from '../config/site';

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

export interface Totals {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
}

export function shippingCost(method: DeliveryMethod | undefined, subtotal: number): number {
  if (!method) return 0;
  if (method.freeFrom !== null && subtotal >= method.freeFrom) return 0;
  return method.cost;
}

/**
 * Totais da encomenda. O desconto corresponde à poupança da pré-venda face
 * ao preço de tabela, para o cliente ver claramente quanto poupa. O valor
 * cobrado é sempre recalculado no servidor (função place_order).
 */
export function computeTotals(
  lines: (PricedLine & { listPrice: number })[],
  method: DeliveryMethod | undefined,
): Totals {
  const gross = lines.reduce((sum, l) => sum + l.listPrice * l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discount = Math.max(0, gross - subtotal);
  const shipping = shippingCost(method, subtotal);
  return { subtotal: gross, shipping, discount, total: subtotal + shipping };
}
