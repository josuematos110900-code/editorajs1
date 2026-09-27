import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Headphones, Minus, Package, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { cn } from '../../lib/cn';
import { editionLabels, type EditionOffer } from '../../lib/editions';
import { formatMoney } from '../../lib/format';
import type { Book, Edition } from '../../types';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

const editionIcon = { fisico: Package, ebook: BookOpen, audiolivro: Headphones } satisfies Record<Edition, unknown>;
const editionHint: Record<Edition, string> = {
  fisico: 'Enviado para a sua morada',
  ebook: 'PDF/EPUB · acesso imediato após o pagamento',
  audiolivro: 'Ouça no site ou descarregue',
};

/**
 * Escolha da edição (físico, e-book, audiolivro), quantidade, ação principal
 * (vai direto ao checkout) e secundária (carrinho).
 */
export function BuyBox({ book, offers, ctaLabel, owned = [] }: { book: Book; offers: EditionOffer[]; ctaLabel: string; owned?: Edition[] }) {
  const { add, lines } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [edition, setEdition] = useState<Edition>(offers[0]?.edition ?? 'fisico');
  const [quantity, setQuantity] = useState(1);

  const offer = offers.find((o) => o.edition === edition) ?? offers[0];
  if (!offer) return null;

  const inCart = lines.find((l) => l.bookId === book.id && l.edition === offer.edition)?.quantity ?? 0;
  const alreadyOwned = owned.includes(offer.edition);
  const max = alreadyOwned ? 0 : Math.max(0, offer.max - inCart);
  const q = Math.min(quantity, Math.max(1, max));
  const physical = offer.edition === 'fisico';

  return (
    <div className="space-y-4">
      {offers.length > 1 && (
        <fieldset>
          <legend className="t-caption mb-2">Escolha a edição</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
            {offers.map((o) => {
              const Icon = editionIcon[o.edition];
              const selected = o.edition === offer.edition;
              return (
                <label
                  key={o.edition}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md border bg-surface p-3 transition-colors',
                    selected ? 'border-secondary ring-1 ring-secondary' : 'border-line-strong/60 hover:border-line-strong',
                  )}
                >
                  <input type="radio" name={`edicao-${book.id}`} value={o.edition} checked={selected} onChange={() => setEdition(o.edition)} className="sr-only" />
                  <Icon size={18} className={selected ? 'mt-0.5 text-primary' : 'mt-0.5 text-muted'} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block t-small font-medium text-fg">{editionLabels[o.edition]}</span>
                    <span className="block t-small font-semibold text-fg">{formatMoney(o.price)}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <p className="t-small text-muted">{editionHint[offer.edition]}</p>

      {alreadyOwned ? (
        <p className="rounded-md bg-success-soft px-4 py-3 t-small text-success" role="status">
          Já tem o {editionLabels[offer.edition].toLowerCase()} deste livro na sua biblioteca.{' '}
          <a href="/conta?separador=biblioteca" className="font-semibold underline">Abrir biblioteca</a>
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            {physical && (
              <div className="flex h-12 shrink-0 items-center justify-between rounded-md border border-line-strong/70 bg-surface sm:justify-start" role="group" aria-label="Quantidade">
                <button type="button" className="flex h-full w-12 items-center justify-center text-muted hover:text-fg disabled:opacity-40" onClick={() => setQuantity(Math.max(1, q - 1))} disabled={q <= 1} aria-label="Diminuir quantidade">
                  <Minus size={16} />
                </button>
                <output className="w-8 text-center font-medium tabular-nums" aria-live="polite">{q}</output>
                <button type="button" className="flex h-full w-12 items-center justify-center text-muted hover:text-fg disabled:opacity-40" onClick={() => setQuantity(Math.min(max, q + 1))} disabled={q >= max} aria-label="Aumentar quantidade">
                  <Plus size={16} />
                </button>
              </div>
            )}
            <Button
              size="lg"
              className="flex-1"
              disabled={max === 0}
              onClick={() => {
                if (inCart === 0 || physical) add(book.id, offer.edition, physical ? q : 1);
                navigate('/checkout');
              }}
            >
              {ctaLabel}
              {offers.length > 1 && ` · ${formatMoney(offer.price * (physical ? q : 1))}`}
            </Button>
          </div>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            disabled={max === 0}
            onClick={() => {
              add(book.id, offer.edition, physical ? q : 1);
              toast({ tone: 'success', message: `«${book.title}» (${editionLabels[offer.edition].toLowerCase()}) foi adicionado ao carrinho.`, action: { label: 'Ver carrinho', to: '/carrinho' } });
            }}
          >
            <ShoppingBag size={17} aria-hidden="true" /> Adicionar ao carrinho
          </Button>
          {max === 0 && inCart > 0 && <p className="t-small text-muted" role="status">Já tem esta edição no carrinho.</p>}
        </>
      )}
    </div>
  );
}
