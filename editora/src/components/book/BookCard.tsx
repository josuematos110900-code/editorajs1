import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext';
import { effectivePrice, getAvailability } from '../../lib/preorder';
import type { Book } from '../../types';
import { AvailabilityBadge } from './Badges';
import { BookCover } from './BookCover';
import { Price } from './Price';

/** Cartão de livro para grelhas do catálogo, autores e relacionados. */
export function BookCard({ book, priority }: { book: Book; priority?: boolean }) {
  const { authorById, preorderFor } = useCatalog();
  const author = authorById(book.authorId);
  const preorder = preorderFor(book.id);
  const availability = getAvailability(book, preorder);
  const price = effectivePrice(book, preorder);
  const previous = price < book.price ? book.price : book.compareAtPrice;
  const href = availability === 'pre_venda' || availability === 'brevemente' ? `/pre-venda/${book.slug}` : `/livros/${book.slug}`;

  return (
    <article className="group relative flex flex-col">
      <div className="transition duration-300 group-hover:-translate-y-1">
        <BookCover book={book} authorName={author?.name} priority={priority} />
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <AvailabilityBadge availability={availability} className="self-start" />
        <h3 className="mt-2 text-lg font-medium leading-snug">
          <Link to={href} className="after:absolute after:inset-0 hover:text-seal-700">
            {book.title}
          </Link>
        </h3>
        {author && <p className="mt-0.5 text-sm text-ink-500">{author.name}</p>}
        <Price value={price} previous={previous} size="sm" className="mt-2" />
      </div>
    </article>
  );
}
