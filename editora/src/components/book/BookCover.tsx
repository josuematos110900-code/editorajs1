import { cn } from '../../lib/cn';
import type { Book } from '../../types';

interface BookCoverProps {
  book: Pick<Book, 'title' | 'subtitle' | 'coverUrl' | 'coverColor'>;
  authorName?: string;
  /** xs = miniatura (listas, resumo): só cor e lombada, sem texto. */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  priority?: boolean;
}

/**
 * Capa do livro. Sem imagem carregada, desenha uma capa tipográfica a partir
 * da cor do livro — o site nunca mostra um quadrado vazio.
 */
export function BookCover({ book, authorName, size = 'md', className, priority }: BookCoverProps) {
  const frame = cn('relative aspect-[2/3] w-full overflow-hidden rounded-[3px] bg-ink-100 shadow-book', size === 'lg' && 'shadow-book-lg', className);

  if (book.coverUrl) {
    return (
      <div className={frame}>
        <img
          src={book.coverUrl}
          alt={`Capa de «${book.title}»${authorName ? `, de ${authorName}` : ''}`}
          className="h-full w-full object-cover"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
        />
        <Spine />
      </div>
    );
  }

  const titleSize = size === 'lg' ? 'text-3xl sm:text-4xl' : size === 'md' ? 'text-xl' : 'text-sm';
  return (
    <div className={frame} style={{ backgroundColor: book.coverColor }} role="img" aria-label={`Capa de «${book.title}»${authorName ? `, de ${authorName}` : ''}`}>
      {size !== 'xs' && (
      <div className={cn('absolute inset-0 flex flex-col justify-between text-paper-50', size === 'sm' ? 'p-3' : 'p-[9%]')}>
        <div className="h-px w-8 bg-paper-50/60" />
        <div>
          <p className={cn('font-display font-medium leading-[1.05]', titleSize)}>{book.title}</p>
          {book.subtitle && size !== 'sm' && <p className="mt-2 text-xs uppercase tracking-[0.14em] text-paper-50/70">{book.subtitle}</p>}
        </div>
        {authorName && size !== 'sm' && <p className="text-xs font-medium uppercase tracking-[0.2em] text-paper-50/85">{authorName}</p>}
      </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,rgba(255,255,255,0.14),transparent_60%)]" />
      <Spine />
    </div>
  );
}

function Spine() {
  return <div className="pointer-events-none absolute inset-y-0 left-0 w-[5%] bg-gradient-to-r from-black/25 via-white/10 to-transparent" aria-hidden="true" />;
}
