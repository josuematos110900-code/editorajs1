import type { ReactNode } from 'react';
import { formatMoney } from '../../lib/format';
import type { Totals } from '../../lib/pricing';

/** Resumo de valores: subtotal, entrega, descontos e total — sempre visíveis. */
export function OrderSummary({ totals, children, shippingPending }: { totals: Totals; children?: ReactNode; shippingPending?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-6">
      <h2 className="text-xl font-medium">Resumo</h2>
      {children && <div className="mt-5 border-b border-ink-100 pb-5">{children}</div>}
      <dl className="mt-5 space-y-2.5 text-sm">
        <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
        <Row label="Descontos" value={totals.discount > 0 ? `− ${formatMoney(totals.discount)}` : formatMoney(0)} highlight={totals.discount > 0} />
        <Row label="Entrega" value={shippingPending ? 'Escolha o método' : totals.shipping === 0 ? 'Grátis' : formatMoney(totals.shipping)} />
        <div className="flex items-baseline justify-between border-t border-ink-100 pt-4">
          <dt className="font-semibold text-ink-900">Total</dt>
          <dd className="font-display text-2xl font-semibold text-ink-950">{formatMoney(totals.total)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-600">{label}</dt>
      <dd className={highlight ? 'font-medium text-leaf-700' : 'text-ink-900'}>{value}</dd>
    </div>
  );
}
