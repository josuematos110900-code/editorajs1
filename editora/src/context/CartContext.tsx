import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartLine } from '../types';

interface CartValue {
  lines: CartLine[];
  count: number;
  add: (bookId: string, quantity?: number) => void;
  setQuantity: (bookId: string, quantity: number) => void;
  remove: (bookId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | undefined>(undefined);
const STORAGE_KEY = 'editora-cart-v1';

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => typeof l.bookId === 'string' && Number.isInteger(l.quantity) && l.quantity > 0) : [];
  } catch {
    return [];
  }
}

/** O carrinho guarda apenas ids e quantidades — preços vêm sempre do catálogo/servidor. */
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(read);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // sem armazenamento: o carrinho fica só em memória
    }
  }, [lines]);

  const add = useCallback((bookId: string, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.bookId === bookId);
      if (existing) return prev.map((l) => (l.bookId === bookId ? { ...l, quantity: Math.min(10, l.quantity + quantity) } : l));
      return [...prev, { bookId, quantity: Math.min(10, quantity) }];
    });
  }, []);

  const setQuantity = useCallback((bookId: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0 ? prev.filter((l) => l.bookId !== bookId) : prev.map((l) => (l.bookId === bookId ? { ...l, quantity: Math.min(10, quantity) } : l)),
    );
  }, []);

  const remove = useCallback((bookId: string) => setLines((prev) => prev.filter((l) => l.bookId !== bookId)), []);
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
