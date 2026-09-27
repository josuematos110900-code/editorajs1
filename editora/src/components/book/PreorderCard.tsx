import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext';
import { formatDate } from '../../lib/format';
import { getPreorderState, remainingUnits } from '../../lib/preorder';
import type { Book, Preorder } from '../../types';
import { PreorderBadge } from './Badges';
import { BookCover } from './BookCover';
import { Countdown } from './Countdown';
import { Price } from './Price';

/** Cartão horizontal de pré-venda: capa, estado, título, autor, preço, lançamento e ação. */
export function PreorderCard({ book, preorder }: { book: Book; preorder: Preorder }) {
  const { authorById } = useCatalog();
  const author = authorById(book.authorId);
  const state = getPreorderState(preorder);
  const left = remainingUnits(preorder);

  return (
    <article className="group relative grid grid-cols-[6.5rem_1fr] gap-5 rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong sm:grid-cols-[9rem_1fr] sm:gap-7 sm:p-6">
      <BookCover book={book} authorName={author?.name} size="sm" />
      <div className="flex min-w-0 flex-col">
        <PreorderBadge state={state} className="self-start" />
        <h3 className="t-h3 mt-3">
          <Link to={`/pre-venda/${book.slug}`} className="after:absolute after:inset-0 group-hover:text-primary">
            {book.title}
          </Link>
        </h3>
        {author && <p className="mt-1 t-small text-muted">{author.name}</p>}
        <Price value={preorder.specialPrice} previous={book.price} size="sm" className="mt-3" />
        <div className="mt-3 space-y-1 t-small text-muted">
          <p>
            <CalendarDays size={14} aria-hidden="true" className="mr-1.5 inline-block -translate-y-px" />
            Lançamento: <span className="text-fg">{formatDate(book.publicationDate)}</span>
          </p>
          {state === 'aberta' && <Countdown to={preorder.endsAt} label="Pré-venda termina em" compact />}
          {state === 'em_breve' && <Countdown to={preorder.startsAt} label="Abre em" compact />}
          {left !== null && state === 'aberta' && left <= 50 && <p className="font-medium text-primary">Restam {left} exemplares</p>}
        </div>
        <span className="mt-auto inline-flex items-center gap-1 pt-4 t-small font-semibold text-fg group-hover:text-primary" aria-hidden="true">
          {state === 'aberta' ? 'Reservar livro' : 'Ver pré-venda'} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}
