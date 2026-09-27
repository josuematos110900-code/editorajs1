import { useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import type { Book } from '../types';
import { effectivePrice, getAvailability, maxPurchasable } from './preorder';

export interface CartItem {
  book: Book;
  quantity: number;
  unitPrice: number;
  listPrice: number;
  isPreorder: boolean;
  max: number;
}

/** Junta o carrinho (ids + quantidades) ao catálogo atual para obter preços e limites. */
export function useCartItems() {
  const { lines } = useCart();
  const { bookById, preorderFor, loading } = useCatalog();

  return useMemo(() => {
    const items: CartItem[] = [];
    const unavailable: string[] = [];
    for (const line of lines) {
      const book = bookById(line.bookId);
      if (!book) {
        if (!loading) unavailable.push(line.bookId);
        continue;
      }
      const preorder = preorderFor(book.id);
      const max = maxPurchasable(book, preorder);
      if (max === 0) {
        unavailable.push(line.bookId);
        continue;
      }
      items.push({
        book,
        quantity: Math.min(line.quantity, max),
        unitPrice: effectivePrice(book, preorder),
        listPrice: book.price,
        isPreorder: getAvailability(book, preorder) === 'pre_venda',
        max,
      });
    }
    return { items, unavailable };
  }, [lines, bookById, preorderFor, loading]);
}
