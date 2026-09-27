import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DataTable } from '../../components/admin/DataTable';
import { AdminPageHeader } from '../../components/layout/AdminLayout';
import { LinePricing, lineTotal } from '../../components/checkout/LinePricing';
import { OrderStatusBadge, PaymentStatusText } from '../../components/OrderStatus';
import { Button } from '../../components/ui/Button';
import { EmptyState, Notice, Spinner } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { deliveryMethods, paymentMethods } from '../../config/site';
import { useCatalog } from '../../context/CatalogContext';
import { api } from '../../data';
import { cn } from '../../lib/cn';
import { formatDate, formatMoney, formatShortDate } from '../../lib/format';
import { allowedTransitions, orderStatusLabels } from '../../lib/orderStatus';
import { useAsync } from '../../lib/useAsync';
import type { Order, OrderStatus, PaymentStatus } from '../../types';

const filters: (OrderStatus | 'todas')[] = ['todas', 'pendente', 'pagamento_confirmado', 'em_preparacao', 'enviado', 'entregue', 'cancelado', 'reembolsado'];

export default function AdminOrders() {
  const { data: orders, loading, error, reload } = useAsync(() => api.admin.listOrders(), []);
  const { reload: reloadPublic } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const status = (params.get('estado') as OrderStatus | null) ?? 'todas';
  const openId = params.get('id');

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (orders ?? []).filter(
      (o) =>
        (status === 'todas' || o.status === status) &&
        (!term || o.number.toLowerCase().includes(term) || o.customerName.toLowerCase().includes(term) || o.customerEmail.toLowerCase().includes(term)),
    );
  }, [orders, status, q]);

  if (loading && !orders) return <Spinner />;
  if (error || !orders) return <Notice tone="error">{error}</Notice>;

  const open = orders.find((o) => o.id === openId) ?? null;
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <AdminPageHeader title="Encomendas" description={`${orders.length} encomendas no total`} />
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1" role="group" aria-label="Filtrar por estado">
        {filters.map((f) => {
          const count = f === 'todas' ? orders.length : orders.filter((o) => o.status === f).length;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={status === f}
              onClick={() => setParam('estado', f === 'todas' ? null : f)}
              className={cn('min-h-10 shrink-0 rounded-full border px-3.5 text-sm', status === f ? 'border-secondary bg-secondary text-background' : 'border-line bg-surface text-fg/85 hover:border-line-strong')}
            >
              {f === 'todas' ? 'Todas' : orderStatusLabels[f]} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
      <label htmlFor="pesquisa-encomendas" className="sr-only">Pesquisar encomendas</label>
      <input id="pesquisa-encomendas" type="search" className="input mb-4 max-w-sm" placeholder="Número, cliente ou e-mail…" value={q} onChange={(e) => setQ(e.target.value)} />

      {visible.length === 0 ? (
        <EmptyState title="Sem encomendas neste filtro" />
      ) : (
        <DataTable caption="Encomendas" head={['Número', 'Data', 'Cliente', 'Estado', 'Pagamento', 'Total']}>
          {visible.map((o) => (
            <tr key={o.id} className="hover:bg-background">
              <td className="px-4 py-3">
                <button type="button" onClick={() => setParam('id', o.id)} className="font-medium underline-offset-2 hover:underline">
                  {o.number}
                </button>
              </td>
              <td className="px-4 py-3 text-muted">{formatShortDate(o.createdAt)}</td>
              <td className="px-4 py-3">
                {o.customerName}
                <p className="text-xs text-muted">{o.customerEmail}</p>
              </td>
              <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
              <td className="px-4 py-3"><PaymentStatusText status={o.payment.status} /></td>
              <td className="px-4 py-3 font-medium tabular-nums">{formatMoney(o.total)}</td>
            </tr>
          ))}
        </DataTable>
      )}

      <Modal open={Boolean(open)} onClose={() => setParam('id', null)} title={open ? `Encomenda ${open.number}` : ''} description={open ? `Criada a ${formatDate(open.createdAt)}` : undefined} wide>
        {open && (
          <OrderDetail
            order={open}
            onChanged={() => {
              reload();
              void reloadPublic();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function OrderDetail({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const next = allowedTransitions(order.status);
  const payment = paymentMethods.find((m) => m.id === order.payment.method);
  const delivery = deliveryMethods.find((m) => m.id === order.deliveryMethod);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro.');
    } finally {
      setBusy(false);
    }
  }

  const paymentActions: { status: PaymentStatus; label: string }[] =
    order.payment.status === 'pendente'
      ? [
          { status: 'aprovado', label: 'Marcar pagamento aprovado' },
          { status: 'recusado', label: 'Marcar recusado' },
        ]
      : order.payment.status === 'aprovado'
        ? [{ status: 'reembolsado', label: 'Registar reembolso' }]
        : [];

  return (
    <div className="space-y-6 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} />
        <PaymentStatusText status={order.payment.status} />
      </div>

      <section>
        <h3 className="mb-2 font-display text-lg">Atualizar estado</h3>
        {next.length === 0 ? (
          <p className="text-muted">Encomenda fechada — sem mudanças de estado possíveis.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {next.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === 'cancelado' || s === 'reembolsado' ? 'ghost' : 'secondary'}
                disabled={busy}
                onClick={() => (s === 'cancelado' || s === 'reembolsado' ? confirm(`Mudar para «${orderStatusLabels[s]}»? O stock será reposto.`) : true) && run(() => api.admin.updateOrderStatus(order.id, s))}
              >
                → {orderStatusLabels[s]}
              </Button>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-md border border-line p-4">
          <h3 className="mb-2 font-display text-lg">Cliente e entrega</h3>
          <p className="font-medium">{order.customerName}</p>
          <p>
            <a className="underline" href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a> · <a className="underline" href={`tel:${order.customerPhone.replace(/\s/g, '')}`}>{order.customerPhone}</a>
          </p>
          <p className="mt-3 font-medium">{delivery?.label ?? order.deliveryMethod}</p>
          {order.shippingAddress.line1 && (
            <address className="not-italic text-muted">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 && `, ${order.shippingAddress.line2}`}
              <br />
              {order.shippingAddress.postalCode} {order.shippingAddress.city}, {order.shippingAddress.country}
            </address>
          )}
        </section>
        <section className="rounded-md border border-line p-4">
          <h3 className="mb-2 font-display text-lg">Pagamento</h3>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt className="text-muted">Método</dt><dd>{payment?.label ?? order.payment.method}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Estado</dt><dd><PaymentStatusText status={order.payment.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">Montante</dt><dd>{formatMoney(order.payment.amount)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Referência</dt><dd className="font-mono text-xs">{order.payment.providerReference ?? order.number}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Atualizado</dt><dd>{formatShortDate(order.payment.updatedAt)}</dd></div>
          </dl>
          {paymentActions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {paymentActions.map((a) => (
                <Button key={a.status} size="sm" variant={a.status === 'aprovado' ? 'primary' : 'ghost'} disabled={busy} onClick={() => run(() => api.admin.setPaymentStatus(order.id, a.status))}>
                  {a.label}
                </Button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <h3 className="mb-2 font-display text-lg">Produtos</h3>
        <ul className="divide-y divide-line rounded-md border border-line">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 px-4 py-2.5">
              <span>
                {i.title}
                {i.isPreorder && <span className="ml-2 text-xs font-semibold text-primary">PRÉ-VENDA</span>}
                <LinePricing quantity={i.quantity} unitPrice={i.unitPrice} listPrice={i.listPrice} />
              </span>
              <span className="tabular-nums">{formatMoney(lineTotal(i))}</span>
            </li>
          ))}
          <li className="flex justify-between px-4 py-2.5 text-muted"><span>Subtotal</span><span>{formatMoney(order.subtotal)}</span></li>
          <li className="flex justify-between px-4 py-2.5 text-muted"><span>Descontos</span><span>− {formatMoney(order.discount)}</span></li>
          <li className="flex justify-between px-4 py-2.5 text-muted"><span>Entrega</span><span>{formatMoney(order.shippingCost)}</span></li>
          <li className="flex justify-between px-4 py-2.5 font-semibold"><span>Total</span><span>{formatMoney(order.total)}</span></li>
        </ul>
      </section>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
