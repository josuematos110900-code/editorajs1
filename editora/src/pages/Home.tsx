import { Link } from 'react-router-dom';
import { CalendarDays, Truck } from 'lucide-react';
import { AuthorPortrait } from '../components/book/AuthorCard';
import { PreorderBadge } from '../components/book/Badges';
import { BookGrid } from '../components/book/BookCard';
import { BookCover } from '../components/book/BookCover';
import { Countdown } from '../components/book/Countdown';
import { PreorderCard } from '../components/book/PreorderCard';
import { Price } from '../components/book/Price';
import { NewsletterForm } from '../components/NewsletterForm';
import { ButtonLink } from '../components/ui/Button';
import { BookGridSkeleton, Notice } from '../components/ui/Feedback';
import { SectionHeader } from '../components/ui/SectionHeader';
import { site } from '../config/site';
import { useCatalog } from '../context/CatalogContext';
import { formatDate } from '../lib/format';
import { getAvailability, getPreorderState } from '../lib/preorder';
import { useSeo } from '../lib/seo';
import type { Book, Preorder } from '../types';

export default function Home() {
  const { books, authors, preorders, loading, error, bookById, preorderFor } = useCatalog();
  useSeo({
    jsonLd: { '@context': 'https://schema.org', '@type': 'Organization', name: site.name, url: typeof window !== 'undefined' ? window.location.origin : undefined, logo: site.logo },
  });

  if (error) return <div className="page"><Notice tone="error" title="Não foi possível carregar a página">{error}</Notice></div>;
  if (loading) return <div className="page"><BookGridSkeleton /></div>;

  const active = preorders
    .filter((p) => ['aberta', 'em_breve'].includes(getPreorderState(p)))
    .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
  const featured = active.find((p) => getPreorderState(p) === 'aberta') ?? active[0];
  const featuredBook = featured ? bookById(featured.bookId) : undefined;
  const otherPreorders = active.filter((p) => p !== featured);

  const today = new Date().toISOString().slice(0, 10);
  const releases = books
    .filter((b) => b.publicationDate && b.publicationDate <= today)
    .sort((a, b) => (b.publicationDate ?? '').localeCompare(a.publicationDate ?? ''))
    .slice(0, 4);
  const available = books.filter((b) => getAvailability(b, preorderFor(b.id)) === 'disponivel' && !releases.includes(b)).slice(0, 4);

  return (
    <>
      {featured && featuredBook ? (
        <Hero book={featuredBook} preorder={featured} behind={otherPreorders[0] ? bookById(otherPreorders[0].bookId) : undefined} />
      ) : (
        <section className="border-b border-line">
          <div className="container-page py-20 sm:py-28">
            <p className="eyebrow">{site.name}</p>
            <h1 className="t-display mt-4 max-w-3xl">{site.tagline}</h1>
            <p className="t-lead mt-6 max-w-prose">{site.description}</p>
            <ButtonLink to="/livros" size="lg" className="mt-8">Explorar o catálogo</ButtonLink>
          </div>
        </section>
      )}

      {otherPreorders.length > 0 && (
        <section className="container-page section" aria-labelledby="sec-pre-vendas">
          <SectionHeader id="sec-pre-vendas" eyebrow="Reserve antes do lançamento" title="Pré-vendas" link={{ to: '/pre-venda', label: 'Ver todas' }} />
          <div className="grid gap-5 lg:grid-cols-2">
            {otherPreorders.map((p) => {
              const book = bookById(p.bookId);
              return book ? <PreorderCard key={p.id} book={book} preorder={p} /> : null;
            })}
          </div>
        </section>
      )}

      {releases.length > 0 && (
        <section className="container-page section" aria-labelledby="sec-lancamentos">
          <SectionHeader id="sec-lancamentos" eyebrow="Acabados de chegar" title="Lançamentos" link={{ to: '/livros?ordem=recentes', label: 'Ver catálogo' }} />
          <BookGrid books={releases} />
        </section>
      )}

      {available.length > 0 && (
        <section className="container-page section" aria-labelledby="sec-catalogo">
          <SectionHeader id="sec-catalogo" eyebrow="Pronto a enviar" title="Do nosso catálogo" link={{ to: '/livros?disponibilidade=disponivel', label: 'Ver disponíveis' }} />
          <BookGrid books={available} />
        </section>
      )}

      {authors.length > 0 && (
        <section className="container-page section" aria-labelledby="sec-autores">
          <SectionHeader id="sec-autores" eyebrow="Quem escreve" title="Os nossos autores" link={{ to: '/autores', label: 'Conhecer todos' }} />
          <ul className="grid gap-x-10 gap-y-12 md:grid-cols-2">
            {authors.slice(0, 4).map((a) => {
              const own = books.filter((b) => b.authorId === a.id);
              return (
                <li key={a.id} className="group relative grid grid-cols-[5.5rem_1fr] gap-5 sm:grid-cols-[7rem_1fr] sm:gap-6">
                  <AuthorPortrait author={a} className="w-full" />
                  <div className="min-w-0">
                    <h3 className="t-h3">
                      <Link to={`/autores/${a.slug}`} className="after:absolute after:inset-0 group-hover:text-primary">{a.name}</Link>
                    </h3>
                    <p className="mt-2 line-clamp-2 t-small text-muted">{a.bio}</p>
                    {own.length > 0 && (
                      <p className="mt-3 t-small text-fg/85">
                        <span className="text-muted">Livros: </span>
                        {own.slice(0, 2).map((b) => `«${b.title}»`).join(', ')}
                        {own.length > 2 && ` e mais ${own.length - 2}`}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="container-page section" aria-labelledby="newsletter-titulo">
        <div className="grid gap-8 rounded-card bg-secondary px-6 py-12 text-background sm:px-12 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="t-caption !text-paper-300">Newsletter</p>
            <h2 id="newsletter-titulo" className="t-h2 mt-2 !text-paper-50">{site.texts.newsletterTitle}</h2>
            <p className="mt-3 max-w-md text-paper-300">{site.texts.newsletterBody}</p>
          </div>
          <NewsletterForm tone="dark" />
        </div>
      </section>
    </>
  );
}

function Hero({ book, preorder, behind }: { book: Book; preorder: Preorder; behind?: Book }) {
  const { authorById } = useCatalog();
  const author = authorById(book.authorId);
  const state = getPreorderState(preorder);
  const open = state === 'aberta';

  return (
    <section className="relative overflow-hidden border-b border-line" aria-labelledby="destaque-titulo">
      <div className="container-page grid items-center gap-12 pb-16 pt-10 sm:pb-20 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24">
        {/* Capa primeiro no telemóvel: o livro é o elemento dominante. */}
        <div className="relative mx-auto w-full max-w-[15rem] sm:max-w-[19rem] lg:order-2 lg:max-w-[22rem]">
          <div className="absolute -inset-x-8 -bottom-8 top-10 rounded-card sm:-inset-x-14" style={{ backgroundColor: `${book.coverColor}1f` }} aria-hidden="true" />
          {behind && (
            <div className="absolute -right-10 top-6 hidden w-[78%] rotate-6 opacity-90 sm:block" aria-hidden="true">
              <BookCover book={behind} size="md" />
            </div>
          )}
          <div className="relative">
            <BookCover book={book} authorName={author?.name} size="lg" priority />
          </div>
        </div>

        <div className="animate-fade-up lg:order-1">
          <PreorderBadge state={state} />
          <h1 id="destaque-titulo" className="t-display mt-5">{book.title}</h1>
          {author && (
            <p className="mt-3 text-lg text-muted">
              de{' '}
              <Link to={`/autores/${author.slug}`} className="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-primary">
                {author.name}
              </Link>
            </p>
          )}
          <p className="t-lead mt-6 max-w-prose">{book.synopsis}</p>

          <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-4">
            <Price value={preorder.specialPrice} previous={book.price} size="lg" />
            <dl className="flex gap-6 t-small">
              <div>
                <dt className="t-caption flex items-center gap-1.5"><CalendarDays size={13} aria-hidden="true" /> Lançamento</dt>
                <dd className="mt-1 font-medium text-fg">{formatDate(book.publicationDate)}</dd>
              </div>
              <div>
                <dt className="t-caption flex items-center gap-1.5"><Truck size={13} aria-hidden="true" /> Envio</dt>
                <dd className="mt-1 font-medium text-fg">{formatDate(preorder.expectedShipDate)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <ButtonLink to={`/pre-venda/${book.slug}`} size="lg">
              {open ? 'Comprar na pré-venda' : 'Ver pré-venda'}
            </ButtonLink>
            <Countdown to={open ? preorder.endsAt : preorder.startsAt} label={open ? 'Termina em' : 'Abre em'} compact />
          </div>
        </div>
      </div>
    </section>
  );
}
