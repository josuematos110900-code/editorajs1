import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import type { Author } from '../../types';

/** A largura vem sempre de className (ex.: "w-16"), para não haver conflito de classes. */
export function AuthorPortrait({ author, className = 'w-full' }: { author: Pick<Author, 'name' | 'photoUrl'>; className?: string }) {
  const initials = author.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('');
  return author.photoUrl ? (
    <img src={author.photoUrl} alt={`Fotografia de ${author.name}`} loading="lazy" className={cn('aspect-square rounded-full object-cover', className)} />
  ) : (
    <div className={cn('flex aspect-square items-center justify-center rounded-full bg-paper-200 font-display text-ink-700 [container-type:inline-size]', className)} role="img" aria-label={`Retrato de ${author.name}`}>
      <span className="text-[length:36cqi] leading-none">{initials}</span>
    </div>
  );
}

export function AuthorCard({ author, bookCount }: { author: Author; bookCount: number }) {
  return (
    <article className="group relative flex flex-col items-center text-center">
      <AuthorPortrait author={author} className="w-32 transition group-hover:scale-[1.03] sm:w-36" />
      <h3 className="mt-4 text-lg font-medium">
        <Link to={`/autores/${author.slug}`} className="after:absolute after:inset-0 hover:text-seal-700">
          {author.name}
        </Link>
      </h3>
      <p className="text-sm text-ink-500">
        {bookCount} {bookCount === 1 ? 'livro' : 'livros'}
      </p>
    </article>
  );
}
