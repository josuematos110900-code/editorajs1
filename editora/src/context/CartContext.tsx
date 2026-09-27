import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartLine, Edition } from '../types';

interface CartValue {
  lines: CartLine[];
  count: number;
  add: (bookId: string, edition: Edition, quantity?: number) => void;
  setQuantity: (bookId: string, edition: Edition, quantity: number) => void;
  remove: (bookId: string, edition: Edition) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | undefined>(undefined);
const STORAGE_KEY = 'editora-cart-v2';
const LEGACY_KEY = 'editora-cart-v1';
const EDITIONS: Edition[] = ['fisico', 'ebook', 'audiolivro'];

/** Digitais: um exemplar por linha. Físicos: até 10. */
const cap = (edition: Edition, q: number) => Math.min(edition === 'fisico' ? 10 : 1, q);

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<CartLine>[]) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((l) => ({ bookId: String(l.bookId ?? ''), edition: EDITIONS.includes(l.edition as Edition) ? (l.edition as Edition) : 'fisico', quantity: Number(l.quantity) }))
      .filter((l) => l.bookId && Number.isInteger(l.quantity) && l.quantity > 0)
      .map((l) => ({ ...l, quantity: cap(l.edition, l.quantity) }));
  } catch {
    return [];
  }
}

const same = (l: CartLine, bookId: string, edition: Edition) => l.bookId === bookId && l.edition === edition;

/** O carrinho guarda apenas ids, edições e quantidades — preços vêm sempre do catálogo/servidor. */
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(read);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // sem armazenamento: o carrinho fica só em memória
    }
  }, [lines]);

  const add = useCallback((bookId: string, edition: Edition, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => same(l, bookId, edition));
      if (existing) return prev.map((l) => (same(l, bookId, edition) ? { ...l, quantity: cap(edition, l.quantity + quantity) } : l));
      return [...prev, { bookId, edition, quantity: cap(edition, quantity) }];
    });
  }, []);

  const setQuantity = useCallback((bookId: string, edition: Edition, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => !same(l, bookId, edition))
        : prev.map((l) => (same(l, bookId, edition) ? { ...l, quantity: cap(edition, quantity) } : l)),
    );
  }, []);

  const remove = useCallback((bookId: string, edition: Edition) => setLines((prev) => prev.filter((l) => !same(l, bookId, edition))), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, count: lines.reduce((n, l) => n + l.quantity, 0), add, setQuantity, remove, clear }),
    [lines, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart fora de CartProvider');
  return ctx;
}
