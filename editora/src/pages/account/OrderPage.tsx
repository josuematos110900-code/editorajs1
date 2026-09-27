import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { LinePricing, lineTotal } from '../../components/checkout/LinePricing';
import { OrderStatusBadge, OrderTimeline, PaymentStatusText } from '../../components/OrderStatus';
import { Button } from '../../components/ui/Button';
import { Notice, Spinner } from '../../components/ui/Feedback';
import { bankDetails, deliveryMethods, paymentMethods } from '../../config/site';
import { useCatalog } from '../../context/CatalogContext';
import { api } from '../../data';
import { formatDate, formatMoney } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { useSeo } from '../../lib/seo';
import NotFound from '../NotFound';

/** Confirmação logo após a compra e página de acompanhamento da encomenda. */
export default function OrderPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { bookById, preorderFor, reload: reloadCatalog } = useCatalog();
  const { data: order, loading, error, reload } = useAsync(() => api.getMyOrder(id), [id]);
  const [openedAt] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  useSeo({ title: order ? `Encomenda ${order.number}` : 'Encomenda', noindex: true });

  if (loading) return <Spinner />;
  if (error) return <div className="container-page py-16"><Notice tone="error">{error}</Notice></div>;
  if (!order) return <NotFound />;

  const delivery = deliveryMethods.find((m) => m.id === order.deliveryMethod);
  const payment = paymentMethods.find((m) => m.id === order.payment.method);
  const justPlaced = openedAt - new Date(order.createdAt).getTime() < 10 * 60_000;
  const paymentParam = params.get('pagamento');
  const ships = order.items
    .filter((i) => i.isPreorder)
    .map((i) => preorderFor(i.bookId)?.expectedShipDate)
    .filter((d): d is string => Boolean(d))
    .sort();

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setActionError('');
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ocorreu um erro.');
    } finally {
      setBusy(false);
      reload();
    }
  }

  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <Link to="/conta" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-950">
        <ArrowLeft size={15} aria-hidden="true" /> As minhas encomendas
      </Link>

      {justPlaced && order.status === 'pendente' && paymentParam !== 'erro' && paymentParam !== 'cancelado' && (
        <div className="mt-6 flex items-start gap-4 rounded-xl bg-leaf-100 p-6 text-leaf-800">
          <CheckCircle2 size={28} className="shrink-0" aria-hidden="true" />
          <div>
            <p className="font-display text-2xl text-leaf-800">Obrigado! A sua encomenda foi registada.</p>
            <p className="mt-1 text-sm">Guardámos os exemplares para si. Conclua o pagamento para a confirmarmos.</p>
          </div>
        </div>
      )}
      {paymentParam === 'sucesso' && order.payment.status === 'aprovado' && <Notice tone="success" className="mt-6" title="Pagamento aprovado">Obrigado! Vamos preparar a sua encomenda.</Notice>}
      {paymentParam === 'sucesso' && order.payment.status === 'pendente' && <Notice className="mt-6" title="A confirmar pagamento">Estamos a aguardar a confirmação do provedor. Esta página atualiza o estado assim que for recebida.</Notice>}
      {paymentParam === 'cancelado' && <Notice tone="error" className="mt-6" title="Pagamento não concluído">Pode tentar novamente abaixo ou escolher outro método contactando-nos.</Notice>}
      {paymentParam === 'erro' && <Notice tone="error" className="mt-6" title="Pagamento online indisponível">A encomenda foi criada, mas não conseguimos abrir o pagamento. Tente novamente abaixo.</Notice>}

      <header className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-500">Encomenda de {formatDate(order.createdAt)}</p>
          <h1 className="mt-1 text-3xl font-medium sm:text-4xl">{order.number}</h1>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      <div className="mt-8 rounded-xl border border-ink-100 bg-white p-5 sm:p-6">
        <OrderTimeline status={order.status} />
        {ships.length > 0 && order.status !== 'cancelado' && (
          <p className="mt-5 text-sm text-ink-600">Inclui pré-venda: envio previsto a partir de <strong>{formatDate(ships[ships.length - 1])}</strong>.</p>
        )}
      </div>

      {order.status === 'pendente' && order.payment.status === 'pendente' && (
        <section className="mt-8 rounded-xl border-2 border-ink-950 bg-white p-6" aria-labelledby="pagar">
          <h2 id="pagar" className="text-2xl font-medium">Como pagar · {formatMoney(order.total)}</h2>
          {order.payment.method === 'referencia' && (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <Info label="Entidade" value={bankDetails.entity} />
              <Info label="Referência" value={order.number} />
              <Info label="Montante" value={formatMoney(order.total)} />
            </dl>
          )}
          {order.payment.method === 'transferencia' && (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Banco" value={bankDetails.bank} />
              <Info label="Titular" value={bankDetails.holder} />
              <Info label="IBAN" value={bankDetails.iban} />
              <Info label="Descritivo obrigatório" value={order.number} />
            </dl>
          )}
          {payment?.kind === 'manual' && (
            <p className="mt-4 text-sm text-ink-600">
              Assim que o pagamento for identificado, a encomenda passa a «Pagamento confirmado» — pode acompanhar tudo nesta página. Indique sempre o número <strong>{order.number}</strong>.
            </p>
          )}
          {order.payment.method === 'gateway' && (
            <Button className="mt-4" loading={busy} onClick={() => run(async () => {
              const { redirectUrl } = await api.startOnlinePayment(order.id);
              if (/^https?:\/\//.test(redirectUrl)) window.location.assign(redirectUrl);
              else navigate(redirectUrl, { replace: true });
            })}>
              Pagar agora
            </Button>
          )}
          {actionError && <Notice tone="error" className="mt-4">{actionError}</Notice>}
          <button
            type="button"
            disabled={busy}
            className="mt-6 block text-sm text-ink-500 underline underline-offset-2 hover:text-seal-700"
            onClick={() => {
              if (confirm('Cancelar esta encomenda? Os exemplares reservados serão libertados.')) {
                void run(async () => {
                  await api.cancelMyOrder(order.id);
                  await reloadCatalog();
                });
              }
            }}
          >
            Cancelar encomenda
          </button>
        </section>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-ink-100 bg-white p-6" aria-labelledby="produtos">
          <h2 id="produtos" className="text-xl font-medium">Produtos</h2>
          <ul className="mt-4 divide-y divide-ink-100">
            {order.items.map((i) => {
              const book = bookById(i.bookId);
              return (
                <li key={i.id} className="flex justify-between gap-4 py-3 text-sm">
                  <div>
                    {book ? <Link to={`/livros/${book.slug}`} className="font-medium hover:text-seal-700">{i.title}</Link> : <span className="font-medium">{i.title}</span>}
                    <LinePricing quantity={i.quantity} unitPrice={i.unitPrice} listPrice={i.listPrice} />
                  </div>
                  <p className="font-medium">{formatMoney(lineTotal(i))}</p>
                </li>
              );
            })}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-ink-100 pt-4 text-sm">
            <Line label="Subtotal" value={formatMoney(order.subtotal)} />
            {order.discount > 0 && <Line label="Descontos" value={`− ${formatMoney(order.discount)}`} />}
            <Line label="Entrega" value={order.shippingCost === 0 ? 'Grátis' : formatMoney(order.shippingCost)} />
            <div className="flex justify-between pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(order.total)}</dd>
            </div>
          </dl>
        </section>
        <section className="space-y-6 rounded-xl border border-ink-100 bg-white p-6 text-sm" aria-label="Entrega e pagamento">
          <div>
            <h2 className="text-xl font-medium">Entrega</h2>
            <p className="mt-2 font-medium">{delivery?.label ?? order.deliveryMethod}</p>
            {order.shippingAddress.line1 && (
              <address className="mt-1 not-italic text-ink-600">
                {order.customerName}
                <br />
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 && <>, {order.shippingAddress.line2}</>}
                <br />
                {order.shippingAddress.postalCode} {order.shippingAddress.city}, {order.shippingAddress.country}
              </address>
            )}
          </div>
          <div>
            <h2 className="text-xl font-medium">Pagamento</h2>
            <p className="mt-2">{payment?.label ?? order.payment.method}</p>
            <PaymentStatusText status={order.payment.status} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-paper-100 px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="mt-1 break-all font-mono text-base font-semibold text-ink-950">{value}</dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-600">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
