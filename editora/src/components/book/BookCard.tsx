import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext';
import { cn } from '../../lib/cn';
import { effectivePrice, getAvailability } from '../../lib/preorder';
import type { Book } from '../../types';
import { AvailabilityBadge } from './Badges';
import { BookCover } from './BookCover';
import { Price } from './Price';

const ctaLabel = { pre_venda: 'Reservar livro', brevemente: 'Ver lançamento', disponivel: 'Ver livro', esgotado: 'Ver livro' } as const;

/** Cartão de livro: a capa domina; estado, título, autor, preço e uma ação. */
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
      <div className="relative transition-transform duration-300 ease-out group-hover:-translate-y-1 motion-reduce:transform-none">
        <BookCover book={book} authorName={author?.name} priority={priority} />
        <AvailabilityBadge availability={availability} className="absolute left-2 top-2 shadow-sm" />
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <h3 className="font-display text-[17px] font-medium leading-snug sm:text-lg">
          <Link to={href} className="after:absolute after:inset-0 group-hover:text-primary">
            {book.title}
          </Link>
        </h3>
        {author && <p className="mt-0.5 t-small text-muted">{author.name}</p>}
        <Price value={price} previous={previous} size="sm" className="mt-2" />
        <span className="mt-3 inline-flex items-center gap-1 t-small font-medium text-fg/85 group-hover:text-primary" aria-hidden="true">
          {ctaLabel[availability]} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}

/**
 * Grelha responsiva de livros: 2 → 3 → 4 colunas. «narrow» para quando a
 * grelha partilha a largura com uma coluna lateral (catálogo com filtros).
 */
export function BookGrid({ books, priorityCount = 0, narrow }: { books: Book[]; priorityCount?: number; narrow?: boolean }) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:gap-x-8', narrow ? 'sm:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-4')}>
      {books.map((b, i) => (
        <BookCard key={b.id} book={b} priority={i < priorityCount} />
      ))}
    </div>
  );
}
