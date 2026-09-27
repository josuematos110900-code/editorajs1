import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { maxPurchasable } from '../../lib/preorder';
import type { Book, Preorder } from '../../types';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

/** Quantidade + ação principal (vai direto ao checkout) + ação secundária (carrinho). */
export function BuyBox({ book, preorder, ctaLabel }: { book: Book; preorder?: Preorder; ctaLabel: string }) {
  const { add, lines } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const inCart = lines.find((l) => l.bookId === book.id)?.quantity ?? 0;
  const limit = maxPurchasable(book, preorder);
  const max = Math.max(0, limit - inCart);
  const [quantity, setQuantity] = useState(1);

  if (limit === 0) return null;
  const q = Math.min(quantity, Math.max(1, max));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex h-12 shrink-0 items-center justify-between rounded-md border border-line-strong/70 bg-surface sm:justify-start" role="group" aria-label="Quantidade">
          <button type="button" className="flex h-full w-12 items-center justify-center text-muted hover:text-fg disabled:opacity-40" onClick={() => setQuantity(Math.max(1, q - 1))} disabled={q <= 1} aria-label="Diminuir quantidade">
            <Minus size={16} />
          </button>
          <output className="w-8 text-center font-medium tabular-nums" aria-live="polite">{q}</output>
          <button type="button" className="flex h-full w-12 items-center justify-center text-muted hover:text-fg disabled:opacity-40" onClick={() => setQuantity(Math.min(max, q + 1))} disabled={q >= max} aria-label="Aumentar quantidade">
            <Plus size={16} />
          </button>
        </div>
        <Button
          size="lg"
          className="flex-1"
          disabled={max === 0}
          onClick={() => {
            add(book.id, q);
            navigate('/checkout');
          }}
        >
          {ctaLabel}
        </Button>
      </div>
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        disabled={max === 0}
        onClick={() => {
          add(book.id, q);
          toast({ tone: 'success', message: `«${book.title}» foi adicionado ao carrinho.`, action: { label: 'Ver carrinho', to: '/carrinho' } });
        }}
      >
        <ShoppingBag size={17} aria-hidden="true" /> Adicionar ao carrinho
      </Button>
      {max === 0 && inCart > 0 && <p className="t-small text-muted" role="status">Já tem no carrinho o máximo disponível.</p>}
    </div>
  );
}
