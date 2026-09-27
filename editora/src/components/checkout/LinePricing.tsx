import { formatMoney } from '../../lib/format';

/**
 * Detalhe de preço de uma linha. As linhas somam sempre ao Subtotal (preço de
 * capa) e a poupança da pré-venda aparece em «Descontos» — assim
 * Subtotal − Descontos + Entrega = Total é verificável pelo cliente.
 */
export function LinePricing({ quantity, unitPrice, listPrice }: { quantity: number; unitPrice: number; listPrice: number }) {
  const saving = (listPrice - unitPrice) * quantity;
  return (
    <>
      <span className="block text-ink-500">
        {quantity} × {formatMoney(listPrice)}
      </span>
      {saving > 0 && <span className="block text-leaf-700">Pré-venda: {formatMoney(unitPrice)}/un. (−{formatMoney(saving)})</span>}
    </>
  );
}

export function lineTotal(item: { quantity: number; listPrice: number }) {
  return item.quantity * item.listPrice;
}
