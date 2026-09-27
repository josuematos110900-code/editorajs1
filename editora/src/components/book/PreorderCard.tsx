import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext';
import { formatDate } from '../../lib/format';
import { getPreorderState, remainingUnits } from '../../lib/preorder';
import type { Book, Preorder } from '../../types';
import { PreorderBadge } from './Badges';
import { BookCover } from './BookCover';
import { Countdown } from './Countdown';
import { Price } from './Price';

/** Destaque horizontal de uma pré-venda (home e página de pré-vendas). */
export function PreorderCard({ book, preorder }: { book: Book; preorder: Preorder }) {
  const { authorById } = useCatalog();
  const author = authorById(book.authorId);
  const state = getPreorderState(preorder);
  const left = remainingUnits(preorder);

  return (
    <article className="relative grid grid-cols-[7.5rem_1fr] gap-5 rounded-lg border border-ink-100 bg-white p-5 transition hover:border-ink-300 sm:grid-cols-[9rem_1fr] sm:gap-7 sm:p-6">
      <BookCover book={book} authorName={author?.name} size="sm" />
      <div className="flex min-w-0 flex-col">
        <PreorderBadge state={state} className="self-start" />
        <h3 className="mt-3 text-xl font-medium leading-tight sm:text-2xl">
          <Link to={`/pre-venda/${book.slug}`} className="after:absolute after:inset-0 hover:text-seal-700">
            {book.title}
          </Link>
        </h3>
        {author && <p className="mt-1 text-sm text-ink-500">{author.name}</p>}
        <Price value={preorder.specialPrice} previous={book.price} size="sm" className="mt-3" />
        <div className="mt-auto space-y-1 pt-4 text-sm text-ink-600">
          {state === 'aberta' && <Countdown to={preorder.endsAt} label="Termina em" compact />}
          {state === 'em_breve' && <Countdown to={preorder.startsAt} label="Abre em" compact />}
          <p>Envio previsto: {formatDate(preorder.expectedShipDate)}</p>
          {left !== null && state === 'aberta' && left <= 50 && <p className="font-medium text-seal-700">Restam {left} exemplares</p>}
        </div>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-950">
          Ver pré-venda <ArrowRight size={15} aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
