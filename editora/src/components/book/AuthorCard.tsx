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
    <div className={cn('flex aspect-square items-center justify-center rounded-full bg-surface-alt font-display text-fg/85 [container-type:inline-size]', className)} role="img" aria-label={`Retrato de ${author.name}`}>
      <span className="text-[length:36cqi] leading-none">{initials}</span>
    </div>
  );
}

/** Cartão editorial de autor: fotografia, nome, descrição curta e número de livros. */
export function AuthorCard({ author, bookCount, latestTitle }: { author: Author; bookCount: number; latestTitle?: string }) {
  return (
    <article className="group relative flex flex-col">
      <AuthorPortrait author={author} className="w-28 transition-transform duration-300 group-hover:scale-[1.02] sm:w-32" />
      <h3 className="t-h3 mt-5">
        <Link to={`/autores/${author.slug}`} className="after:absolute after:inset-0 group-hover:text-primary">
          {author.name}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 t-small text-muted">{author.bio}</p>
      <p className="mt-3 t-small text-fg/85">
        {bookCount} {bookCount === 1 ? 'livro' : 'livros'}
        {latestTitle && <span className="text-muted"> · mais recente: «{latestTitle}»</span>}
      </p>
    </article>
  );
}

/** Cabeçalho da página de autor: fotografia, nome e biografia. */
export function AuthorHero({ author, children }: { author: Author; children?: React.ReactNode }) {
  return (
    <header className="grid items-center gap-8 border-b border-line pb-12 sm:grid-cols-[11rem_1fr] sm:gap-12 lg:grid-cols-[14rem_1fr]">
      <AuthorPortrait author={author} className="mx-auto w-40 sm:mx-0 sm:w-full" />
      <div>
        <p className="eyebrow flex items-center gap-3">Autor{children}</p>
        <h1 className="t-display mt-3">{author.name}</h1>
        <p className="t-lead mt-5 max-w-prose">{author.bio}</p>
      </div>
    </header>
  );
}
