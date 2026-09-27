import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { maxPurchasable } from '../../lib/preorder';
import type { Book, Preorder } from '../../types';
import { Button } from '../ui/Button';

/** Quantidade + "Comprar agora" (vai direto ao checkout) + "Adicionar ao carrinho". */
export function BuyBox({ book, preorder, ctaLabel }: { book: Book; preorder?: Preorder; ctaLabel: string }) {
  const { add, lines } = useCart();
  const navigate = useNavigate();
  const inCart = lines.find((l) => l.bookId === book.id)?.quantity ?? 0;
  const max = Math.max(0, maxPurchasable(book, preorder) - inCart);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (maxPurchasable(book, preorder) === 0) return null;

  const q = Math.min(quantity, Math.max(1, max));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex h-12 items-center rounded-md border border-ink-200 bg-white" role="group" aria-label="Quantidade">
          <button type="button" className="h-full px-3 text-ink-600 hover:text-ink-950 disabled:opacity-40" onClick={() => setQuantity(Math.max(1, q - 1))} disabled={q <= 1} aria-label="Diminuir quantidade">
            <Minus size={16} />
          </button>
          <output className="w-8 text-center font-medium tabular-nums" aria-live="polite">
            {q}
          </output>
          <button type="button" className="h-full px-3 text-ink-600 hover:text-ink-950 disabled:opacity-40" onClick={() => setQuantity(Math.min(max, q + 1))} disabled={q >= max} aria-label="Aumentar quantidade">
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
          setAdded(true);
        }}
      >
        <ShoppingBag size={17} aria-hidden="true" /> Adicionar ao carrinho
      </Button>
      <p className="min-h-5 text-sm" role="status" aria-live="polite">
        {added ? (
          <span className="text-leaf-700">Adicionado ao carrinho.</span>
        ) : max === 0 && inCart > 0 ? (
          <span className="text-ink-500">Já tem o máximo disponível no carrinho.</span>
        ) : null}
      </p>
    </div>
  );
}
