import { editionLabels } from '../../lib/editions';
import { formatMoney } from '../../lib/format';
import type { Edition } from '../../types';

/**
 * Detalhe de preço de uma linha. As linhas somam sempre ao Subtotal (preço de
 * capa) e a poupança da pré-venda aparece em «Descontos» — assim
 * Subtotal − Descontos + Entrega = Total é verificável pelo cliente.
 */
export function LinePricing({ quantity, unitPrice, listPrice, edition = 'fisico' }: { quantity: number; unitPrice: number; listPrice: number; edition?: Edition }) {
  const saving = (listPrice - unitPrice) * quantity;
  return (
    <>
      <span className="block text-muted">
        {edition !== 'fisico' ? (
          <>
            <span className="font-medium text-fg/85">{editionLabels[edition]}</span> · {formatMoney(listPrice)}
          </>
        ) : (
          <>
            {quantity} × {formatMoney(listPrice)}
          </>
        )}
      </span>
      {saving > 0 && <span className="block text-success">Pré-venda: {formatMoney(unitPrice)}/un. (−{formatMoney(saving)})</span>}
    </>
  );
}

export function lineTotal(item: { quantity: number; listPrice: number }) {
  return item.quantity * item.listPrice;
}
