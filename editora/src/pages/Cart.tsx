import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { BookCover } from '../components/book/BookCover';
import { LinePricing, lineTotal } from '../components/checkout/LinePricing';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { ButtonLink } from '../components/ui/Button';
import { EmptyState, Notice, Spinner } from '../components/ui/Feedback';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { cn } from '../lib/cn';
import { formatMoney } from '../lib/format';
import { computeTotals } from '../lib/pricing';
import { useSeo } from '../lib/seo';
import { useCartItems } from '../lib/useCartItems';

export default function Cart() {
  const { setQuantity, remove } = useCart();
  const { loading, authorById } = useCatalog();
  const { items, unavailable } = useCartItems();
  useSeo({ title: 'Carrinho', noindex: true });

  if (loading) return <Spinner />;

  const totals = computeTotals(items, undefined);

  return (
    <div className="page">
      <h1 className="t-h1">Carrinho</h1>
      {unavailable.length > 0 && (
        <Notice tone="error" className="mt-6" title="Alguns livros deixaram de estar disponíveis">
          Foram retirados do resumo e não serão incluídos na encomenda.{' '}
          <button type="button" className="underline" onClick={() => unavailable.forEach((u) => remove(u.bookId, u.edition))}>
            Remover do carrinho
          </button>
        </Notice>
      )}
      {items.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="O carrinho está vazio" action={<ButtonLink to="/livros">Explorar o catálogo</ButtonLink>}>
            Descubra os livros em pré-venda e os últimos lançamentos.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
          <ul className="divide-y divide-line border-y border-line">
            {items.map((item) => (
              <li key={`${item.book.id}:${item.edition}`} className="grid grid-cols-[5rem_1fr] gap-5 py-6 sm:grid-cols-[6rem_1fr_auto]">
                <BookCover book={item.book} size="sm" />
                <div className="min-w-0">
                  <Link to={`/${item.isPreorder ? 'pre-venda' : 'livros'}/${item.book.slug}`} className="font-display text-lg font-medium hover:text-primary">
                    {item.book.title}
                  </Link>
                  <p className="text-sm text-muted">{authorById(item.book.authorId)?.name}</p>
                  {item.isPreorder && <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary">Pré-venda</p>}
                  <p className="mt-2 text-sm">
                    <LinePricing quantity={item.quantity} unitPrice={item.unitPrice} listPrice={item.listPrice} edition={item.edition} />
                  </p>
                  <div className={cn('mt-3 flex items-center gap-3 sm:hidden', item.edition !== 'fisico' && '!hidden')}>
                    <QuantityControl item={item} onChange={(q) => setQuantity(item.book.id, item.edition, q)} />
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end">
                  <div className={cn('hidden sm:block', item.edition !== 'fisico' && 'sm:!hidden')}>
                    <QuantityControl item={item} onChange={(q) => setQuantity(item.book.id, item.edition, q)} />
                  </div>
                  <p className="font-semibold">{formatMoney(lineTotal(item))}</p>
                  <button type="button" onClick={() => remove(item.book.id, item.edition)} className="-my-2 flex min-h-11 items-center gap-1 t-small text-muted hover:text-danger">
                    <Trash2 size={15} aria-hidden="true" /> Remover <span className="sr-only">«{item.book.title}»</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <OrderSummary totals={totals} shippingPending />
            <ButtonLink to="/checkout" size="lg" className="w-full">
              Continuar para pagamento
            </ButtonLink>
            <ButtonLink to="/livros" variant="ghost" className="w-full">
              Continuar a comprar
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}

function QuantityControl({ item, onChange }: { item: { quantity: number; max: number; book: { title: string } }; onChange: (q: number) => void }) {
  return (
    <div className="flex h-11 items-center rounded-md border border-line bg-surface" role="group" aria-label={`Quantidade de «${item.book.title}»`}>
      <button type="button" className="flex h-full w-11 items-center justify-center disabled:opacity-40" onClick={() => onChange(item.quantity - 1)} aria-label="Diminuir">
        <Minus size={14} />
      </button>
      <span className="w-7 text-center text-sm tabular-nums">{item.quantity}</span>
      <button type="button" className="flex h-full w-11 items-center justify-center disabled:opacity-40" disabled={item.quantity >= item.max} onClick={() => onChange(item.quantity + 1)} aria-label="Aumentar">
        <Plus size={14} />
      </button>
    </div>
  );
}
