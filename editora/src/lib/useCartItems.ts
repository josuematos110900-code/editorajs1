import { useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import type { Book, Edition } from '../types';
import { editionOffers } from './editions';

export interface CartItem {
  book: Book;
  edition: Edition;
  quantity: number;
  unitPrice: number;
  listPrice: number;
  isPreorder: boolean;
  max: number;
}

/** Junta o carrinho (ids + edições + quantidades) ao catálogo atual para obter preços e limites. */
export function useCartItems() {
  const { lines } = useCart();
  const { bookById, preorderFor, digitalFiles, loading } = useCatalog();

  return useMemo(() => {
    const items: CartItem[] = [];
    const unavailable: { bookId: string; edition: Edition }[] = [];
    for (const line of lines) {
      const book = bookById(line.bookId);
      const offer = book ? editionOffers(book, preorderFor(book.id), digitalFiles).find((o) => o.edition === line.edition) : undefined;
      if (!book || !offer) {
        if (!loading) unavailable.push({ bookId: line.bookId, edition: line.edition });
        continue;
      }
      items.push({
        book,
        edition: line.edition,
        quantity: Math.min(line.quantity, offer.max),
        unitPrice: offer.price,
        listPrice: offer.listPrice,
        isPreorder: offer.isPreorder,
        max: offer.max,
      });
    }
    const physical = items.some((i) => i.edition === 'fisico');
    return { items, unavailable, digitalOnly: items.length > 0 && !physical };
  }, [lines, bookById, preorderFor, digitalFiles, loading]);
}
