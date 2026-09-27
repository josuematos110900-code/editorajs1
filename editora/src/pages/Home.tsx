import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AuthorCard } from '../components/book/AuthorCard';
import { PreorderBadge } from '../components/book/Badges';
import { BookCard } from '../components/book/BookCard';
import { BookCover } from '../components/book/BookCover';
import { Countdown } from '../components/book/Countdown';
import { PreorderCard } from '../components/book/PreorderCard';
import { Price } from '../components/book/Price';
import { NewsletterForm } from '../components/NewsletterForm';
import { ButtonLink } from '../components/ui/Button';
import { Notice, Spinner } from '../components/ui/Feedback';
import { site } from '../config/site';
import { useCatalog } from '../context/CatalogContext';
import { formatDate } from '../lib/format';
import { getPreorderState } from '../lib/preorder';
import { useSeo } from '../lib/seo';

export default function Home() {
  const { books, authors, preorders, loading, error, bookById, authorById } = useCatalog();
  useSeo({
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: site.name,
      url: typeof window !== 'undefined' ? window.location.origin : undefined,
      logo: site.logo,
    },
  });

  if (loading) return <Spinner />;
  if (error) return <div className="container-page py-16"><Notice tone="error" title="Não foi possível carregar a página">{error}</Notice></div>;

  const activePreorders = preorders
    .filter((p) => ['aberta', 'em_breve'].includes(getPreorderState(p)))
    .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
  const featured = activePreorders.find((p) => getPreorderState(p) === 'aberta') ?? activePreorders[0];
  const featuredBook = featured ? bookById(featured.bookId) : undefined;
  const featuredAuthor = featuredBook ? authorById(featuredBook.authorId) : undefined;
  const otherPreorders = activePreorders.filter((p) => p !== featured);

  const today = new Date().toISOString().slice(0, 10);
  const releases = books
    .filter((b) => b.publicationDate && b.publicationDate <= today)
    .sort((a, b) => (b.publicationDate ?? '').localeCompare(a.publicationDate ?? ''))
    .slice(0, 4);
  const catalogSample = books.slice(0, 8);

  return (
    <>
      {/* Destaque da pré-venda */}
      {featured && featuredBook ? (
        <section className="relative overflow-hidden border-b border-ink-100" aria-labelledby="destaque-titulo">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 lg:block" style={{ background: `linear-gradient(135deg, ${featuredBook.coverColor}14, ${featuredBook.coverColor}33)` }} />
          <div className="container-page relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:py-24">
            <div className="animate-fade-up">
              <p className="eyebrow">{getPreorderState(featured) === 'aberta' ? site.texts.heroEyebrow : 'Pré-venda em breve'}</p>
              <h1 id="destaque-titulo" className="mt-4 text-4xl font-medium leading-[1.05] sm:text-5xl lg:text-6xl">
                {featuredBook.title}
              </h1>
              {featuredAuthor && (
                <p className="mt-3 text-lg text-ink-600">
                  de{' '}
                  <Link to={`/autores/${featuredAuthor.slug}`} className="underline decoration-ink-300 underline-offset-4 hover:decoration-seal-700">
                    {featuredAuthor.name}
                  </Link>
                </p>
              )}
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-700">{featuredBook.synopsis}</p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Price value={featured.specialPrice} previous={featuredBook.price} size="lg" />
                <PreorderBadge state={getPreorderState(featured)} />
              </div>
              <div className="mt-8 max-w-sm">
                {getPreorderState(featured) === 'aberta' ? (
                  <Countdown to={featured.endsAt} label="A pré-venda termina em" />
                ) : (
                  <Countdown to={featured.startsAt} label="A pré-venda abre em" />
                )}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink to={`/pre-venda/${featuredBook.slug}`} size="lg">
                  Reservar o meu exemplar
                </ButtonLink>
                <ButtonLink to="/pre-venda" variant="ghost" size="lg">
                  Todas as pré-vendas <ArrowRight size={16} aria-hidden="true" />
                </ButtonLink>
              </div>
              <p className="mt-4 text-sm text-ink-500">Envio previsto a partir de {formatDate(featured.expectedShipDate)}.</p>
            </div>
            <div className="mx-auto w-full max-w-[20rem] sm:max-w-sm lg:rotate-[1.5deg]">
              <BookCover book={featuredBook} authorName={featuredAuthor?.name} size="lg" priority />
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-ink-100">
          <div className="container-page py-20 sm:py-28">
            <p className="eyebrow">{site.name}</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-medium leading-[1.05] sm:text-6xl">{site.tagline}</h1>
            <p className="mt-6 max-w-xl text-lg text-ink-700">{site.description}</p>
            <ButtonLink to="/livros" size="lg" className="mt-8">
              Explorar o catálogo
            </ButtonLink>
          </div>
        </section>
      )}

      {otherPreorders.length > 0 && (
        <Section title="Mais pré-vendas" eyebrow="Reserve já" link={{ to: '/pre-venda', label: 'Ver todas' }}>
          <div className="grid gap-5 lg:grid-cols-2">
            {otherPreorders.map((p) => {
              const book = bookById(p.bookId);
              return book ? <PreorderCard key={p.id} book={book} preorder={p} /> : null;
            })}
          </div>
        </Section>
      )}

      {releases.length > 0 && (
        <Section title="Lançamentos" eyebrow="Acabados de chegar" link={{ to: '/livros?ordem=recentes', label: 'Ver catálogo' }}>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 md:grid-cols-4">
            {releases.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Catálogo" eyebrow="Todos os livros" link={{ to: '/livros', label: 'Ver tudo' }}>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4">
          {catalogSample.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      </Section>

      {authors.length > 0 && (
        <Section title="Os nossos autores" eyebrow="Quem escreve" link={{ to: '/autores', label: 'Conhecer todos' }}>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {authors.slice(0, 4).map((a) => (
              <AuthorCard key={a.id} author={a} bookCount={books.filter((b) => b.authorId === a.id).length} />
            ))}
          </div>
        </Section>
      )}

      <section className="container-page mt-24" aria-labelledby="newsletter-titulo">
        <div className="grid gap-8 rounded-xl bg-seal-800 px-6 py-12 text-paper-50 sm:px-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 id="newsletter-titulo" className="text-3xl font-medium text-paper-50 sm:text-4xl">
              {site.texts.newsletterTitle}
            </h2>
            <p className="mt-3 max-w-md text-seal-100">{site.texts.newsletterBody}</p>
          </div>
          <NewsletterForm tone="dark" />
        </div>
      </section>
    </>
  );
}

function Section({ title, eyebrow, link, children }: { title: string; eyebrow: string; link?: { to: string; label: string }; children: React.ReactNode }) {
  const id = `sec-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <section className="container-page mt-20 sm:mt-24" aria-labelledby={id}>
      <div className="mb-8 flex items-end justify-between gap-4 border-b border-ink-100 pb-4">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={id} className="mt-2 text-3xl font-medium sm:text-4xl">
            {title}
          </h2>
        </div>
        {link && (
          <Link to={link.to} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ink-900 hover:text-seal-700">
            {link.label} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
