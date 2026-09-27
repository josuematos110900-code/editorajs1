import type { ReactNode } from 'react';
import { formatMoney } from '../../lib/format';
import type { Totals } from '../../lib/pricing';

/** Resumo de valores: subtotal, entrega, descontos e total — sempre visíveis. */
export function OrderSummary({ totals, children, shippingPending }: { totals: Totals; children?: ReactNode; shippingPending?: boolean }) {
  return (
    <div className="rounded-card border border-line bg-surface p-6">
      <h2 className="text-xl font-medium">Resumo</h2>
      {children && <div className="mt-5 border-b border-line pb-5">{children}</div>}
      <dl className="mt-5 space-y-2.5 text-sm">
        <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
        <Row label="Descontos" value={totals.discount > 0 ? `− ${formatMoney(totals.discount)}` : formatMoney(0)} highlight={totals.discount > 0} />
        <Row label="Entrega" value={shippingPending ? 'Escolha o método' : totals.shipping === 0 ? 'Grátis' : formatMoney(totals.shipping)} />
        <div className="flex items-baseline justify-between border-t border-line pt-4">
          <dt className="font-semibold text-fg">Total</dt>
          <dd className="font-display text-2xl font-semibold text-fg">{formatMoney(totals.total)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={highlight ? 'font-medium text-success' : 'text-fg'}>{value}</dd>
    </div>
  );
}
