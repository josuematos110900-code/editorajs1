import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { LinePricing, lineTotal } from '../../components/checkout/LinePricing';
import { OrderStatusBadge, OrderTimeline, PaymentStatusText } from '../../components/OrderStatus';
import { Button, buttonClasses } from '../../components/ui/Button';
import { Notice, Spinner } from '../../components/ui/Feedback';
import { bankDetails, findDeliveryMethod, paymentMethods } from '../../config/site';
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

  const delivery = findDeliveryMethod(order.deliveryMethod);
  const payment = paymentMethods.find((m) => m.id === order.payment.method);
  const justPlaced = openedAt - new Date(order.createdAt).getTime() < 10 * 60_000;
  const paymentParam = params.get('pagamento');
  const hasPreorder = order.items.some((i) => i.isPreorder);
  const launch = order.items
    .filter((i) => i.isPreorder)
    .map((i) => bookById(i.bookId)?.publicationDate)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
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
      <Link to="/conta" className="-my-2 inline-flex min-h-11 items-center gap-1 t-small text-muted hover:text-fg">
        <ArrowLeft size={15} aria-hidden="true" /> As minhas encomendas
      </Link>

      {justPlaced && order.status === 'pendente' && paymentParam !== 'erro' && paymentParam !== 'cancelado' && (
        <section className="mt-6 animate-fade-up rounded-card border border-success/25 bg-surface px-6 py-10 text-center sm:px-10" aria-labelledby="confirmacao">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
            <Check size={28} aria-hidden="true" />
          </span>
          <h1 id="confirmacao" className="t-h2 mt-5">{hasPreorder ? 'Reserva registada!' : 'Encomenda registada!'}</h1>
          <p className="t-lead mx-auto mt-2 max-w-md">Obrigado pela sua encomenda. Falta só o pagamento — as instruções estão abaixo.</p>
          <dl className="mx-auto mt-8 grid max-w-md gap-4 border-t border-line pt-6 text-left sm:grid-cols-2">
            <div>
              <dt className="t-caption">Encomenda</dt>
              <dd className="mt-1 font-display text-xl text-fg">#{order.number}</dd>
            </div>
            {launch && (
              <div>
                <dt className="t-caption">Lançamento previsto</dt>
                <dd className="mt-1 font-display text-xl text-fg">{formatDate(launch)}</dd>
              </div>
            )}
          </dl>
          <a href="#pagar" className={buttonClasses('primary', 'lg', 'mt-8')}>Ver como pagar</a>
        </section>
      )}
      {paymentParam === 'sucesso' && order.payment.status === 'aprovado' && <Notice tone="success" className="mt-6" title="Pagamento aprovado">Obrigado! Vamos preparar a sua encomenda.</Notice>}
      {paymentParam === 'sucesso' && order.payment.status === 'pendente' && <Notice className="mt-6" title="A confirmar pagamento">Estamos a aguardar a confirmação do provedor. Esta página atualiza o estado assim que for recebida.</Notice>}
      {paymentParam === 'cancelado' && <Notice tone="error" className="mt-6" title="Pagamento não concluído">Pode tentar novamente abaixo ou escolher outro método contactando-nos.</Notice>}
      {paymentParam === 'erro' && <Notice tone="error" className="mt-6" title="Pagamento online indisponível">A encomenda foi criada, mas não conseguimos abrir o pagamento. Tente novamente abaixo.</Notice>}

      <header className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">Encomenda de {formatDate(order.createdAt)}</p>
          {justPlaced && order.status === 'pendente' ? (
            <p className="t-h2 mt-1">{order.number}</p>
          ) : (
            <h1 className="t-h1 mt-1">{order.number}</h1>
          )}
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      {order.items.some((i) => i.edition !== 'fisico') && ['pagamento_confirmado', 'em_preparacao', 'enviado', 'entregue'].includes(order.status) && (
        <Notice tone="success" className="mt-6" title="Os seus livros digitais estão prontos">
          Abra-os em <Link to="/conta?separador=biblioteca" className="font-semibold underline">A minha conta → Biblioteca</Link>.
        </Notice>
      )}

      <div className="mt-8 rounded-card border border-line bg-surface p-5 sm:p-6">
        <OrderTimeline status={order.status} />
        {ships.length > 0 && order.status !== 'cancelado' && (
          <p className="mt-5 text-sm text-muted">Inclui pré-venda: envio previsto a partir de <strong>{formatDate(ships[ships.length - 1])}</strong>.</p>
        )}
      </div>

      {order.status === 'pendente' && order.payment.status === 'pendente' && (
        <section id="pagar" className="mt-8 scroll-mt-24 rounded-card border-2 border-secondary bg-surface p-6" aria-labelledby="pagar-titulo">
          <h2 id="pagar-titulo" className="t-h3">Como pagar · {formatMoney(order.total)}</h2>
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
            <p className="mt-4 text-sm text-muted">
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
            className="mt-6 block text-sm text-muted underline underline-offset-2 hover:text-primary"
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
        <section className="rounded-card border border-line bg-surface p-6" aria-labelledby="produtos">
          <h2 id="produtos" className="t-h4">Produtos</h2>
          <ul className="mt-4 divide-y divide-line">
            {order.items.map((i) => {
              const book = bookById(i.bookId);
              return (
                <li key={i.id} className="flex justify-between gap-4 py-3 text-sm">
                  <div>
                    {book ? <Link to={`/livros/${book.slug}`} className="font-medium hover:text-primary">{i.title}</Link> : <span className="font-medium">{i.title}</span>}
                    <LinePricing quantity={i.quantity} unitPrice={i.unitPrice} listPrice={i.listPrice} edition={i.edition} />
                  </div>
                  <p className="font-medium">{formatMoney(lineTotal(i))}</p>
                </li>
              );
            })}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
            <Line label="Subtotal" value={formatMoney(order.subtotal)} />
            {order.discount > 0 && <Line label="Descontos" value={`− ${formatMoney(order.discount)}`} />}
            <Line label="Entrega" value={order.shippingCost === 0 ? 'Grátis' : formatMoney(order.shippingCost)} />
            <div className="flex justify-between pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(order.total)}</dd>
            </div>
          </dl>
        </section>
        <section className="space-y-6 rounded-card border border-line bg-surface p-6 text-sm" aria-label="Entrega e pagamento">
          <div>
            <h2 className="t-h4">Entrega</h2>
            <p className="mt-2 font-medium">{delivery?.label ?? order.deliveryMethod}</p>
            {order.shippingAddress.line1 && (
              <address className="mt-1 not-italic text-muted">
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
            <h2 className="t-h4">Pagamento</h2>
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
    <div className="rounded-md bg-background px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 break-all font-mono text-base font-semibold text-fg">{value}</dd>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
