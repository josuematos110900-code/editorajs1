import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AvailabilityBadge } from '../components/book/Badges';
import { BookGrid } from '../components/book/BookCard';
import { BookCover } from '../components/book/BookCover';
import { BuyBox } from '../components/book/BuyBox';
import { Price } from '../components/book/Price';
import { ButtonLink } from '../components/ui/Button';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { DemoBadge, Spinner } from '../components/ui/Feedback';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useCatalog } from '../context/CatalogContext';
import { site } from '../config/site';
import { cn } from '../lib/cn';
import { formatDate, formatLabels } from '../lib/format';
import { effectivePrice, getAvailability } from '../lib/preorder';
import { absoluteUrl, useSeo } from '../lib/seo';
import NotFound from './NotFound';

export default function BookPage() {
  const { slug = '' } = useParams();
  const { loading, bookBySlug, authorById, categoryById, preorderFor, books } = useCatalog();
  const book = bookBySlug(slug);
  const author = book ? authorById(book.authorId) : undefined;
  const preorder = book ? preorderFor(book.id) : undefined;
  const [image, setImage] = useState(0);

  const availability = book ? getAvailability(book, preorder) : 'esgotado';
  const price = book ? effectivePrice(book, preorder) : 0;

  useSeo({
    title: book ? `${book.title}${author ? ` — ${author.name}` : ''}` : undefined,
    description: book?.synopsis,
    image: book?.coverUrl,
    path: book ? `/livros/${book.slug}` : undefined,
    type: 'book',
    jsonLd: book
      ? {
          '@context': 'https://schema.org',
          '@type': 'Book',
          name: book.title,
          author: author ? { '@type': 'Person', name: author.name } : undefined,
          isbn: book.isbn ?? undefined,
          numberOfPages: book.pages ?? undefined,
          inLanguage: book.language,
          datePublished: book.publicationDate ?? undefined,
          publisher: { '@type': 'Organization', name: book.publisher || site.name },
          image: book.coverUrl ? absoluteUrl(book.coverUrl) : undefined,
          description: book.synopsis,
          offers: {
            '@type': 'Offer',
            price,
            priceCurrency: site.currency.code,
            url: absoluteUrl(`/livros/${book.slug}`),
            availability:
              availability === 'disponivel'
                ? 'https://schema.org/InStock'
                : availability === 'pre_venda' || availability === 'brevemente'
                  ? 'https://schema.org/PreOrder'
                  : 'https://schema.org/OutOfStock',
          },
        }
      : undefined,
  });

  if (loading) return <Spinner />;
  if (!book) return <NotFound />;

  const category = categoryById(book.categoryId);
  const images = [book.coverUrl, ...book.gallery].filter((x): x is string => Boolean(x));
  const related = books.filter((b) => b.id !== book.id && (b.categoryId === book.categoryId || b.authorId === book.authorId)).slice(0, 4);

  // 8 campos: a grelha fecha certo em 2 e em 4 colunas.
  const details: [string, React.ReactNode][] = [
    ['Autor', author ? <Link key="a" to={`/autores/${author.slug}`} className="underline decoration-line-strong underline-offset-4 hover:text-primary">{author.name}</Link> : '—'],
    ['ISBN', book.isbn ?? '—'],
    ['Páginas', book.pages ?? '—'],
    ['Formato', book.formats.map((f) => formatLabels[f]).join(', ')],
    ['Idioma', book.language],
    ['Género', category ? <Link key="g" to={`/livros?genero=${category.slug}`} className="underline decoration-line-strong underline-offset-4 hover:text-primary">{category.name}</Link> : '—'],
    ['Editora', book.publisher || site.name],
    ['Lançamento', formatDate(book.publicationDate)],
  ];

  return (
    <>
      <div className="page">
        <Breadcrumb items={[{ label: 'Catálogo', to: '/livros' }, ...(category ? [{ label: category.name, to: `/livros?genero=${category.slug}` }] : []), { label: book.title }]} />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
          <div className="mx-auto w-full max-w-[13rem] sm:max-w-[18rem] lg:sticky lg:top-24 lg:max-w-none lg:self-start">
            <BookCover book={{ ...book, coverUrl: images[image] ?? book.coverUrl }} authorName={author?.name} size="lg" priority />
            {images.length > 1 && (
              <ul className="mt-5 flex flex-wrap gap-3" aria-label="Galeria de imagens">
                {images.map((src, i) => (
                  <li key={src}>
                    <button
                      type="button"
                      onClick={() => setImage(i)}
                      aria-label={i === 0 ? 'Ver capa' : `Ver imagem ${i + 1}`}
                      aria-pressed={i === image}
                      className={cn('block w-14 overflow-hidden rounded-sm ring-offset-2 ring-offset-background transition', i === image ? 'ring-2 ring-secondary' : 'opacity-70 hover:opacity-100')}
                    >
                      <img src={src} alt="" loading="lazy" className="aspect-[2/3] w-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <AvailabilityBadge availability={availability} />
              {book.isDemo && <DemoBadge />}
            </div>
            <h1 className="t-h1 mt-4">{book.title}</h1>
            {book.subtitle && <p className="mt-2 text-xl text-muted">{book.subtitle}</p>}
            {author && (
              <p className="mt-3 text-lg text-muted">
                de <Link to={`/autores/${author.slug}`} className="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-primary">{author.name}</Link>
              </p>
            )}

            <div className="mt-8 max-w-md">
              <Price value={price} previous={price < book.price ? book.price : book.compareAtPrice} size="lg" />
              <p className="mt-1 t-small text-muted">
                {availability === 'disponivel'
                  ? book.stock <= 5
                    ? `Últimos ${book.stock} exemplares · envio em até 2 dias úteis`
                    : 'Em stock · envio em até 2 dias úteis'
                  : availability === 'esgotado'
                    ? 'Esgotado de momento'
                    : `Lançamento a ${formatDate(book.publicationDate)}`}
              </p>
              <div className="mt-6">
                {availability === 'pre_venda' || availability === 'brevemente' ? (
                  <ButtonLink to={`/pre-venda/${book.slug}`} size="lg" className="w-full sm:w-auto">
                    {availability === 'pre_venda' ? 'Reservar na pré-venda' : 'Ver pré-venda'} <ArrowRight size={16} aria-hidden="true" />
                  </ButtonLink>
                ) : availability === 'disponivel' ? (
                  <BuyBox book={book} ctaLabel="Comprar agora" />
                ) : (
                  <p className="rounded-md bg-surface-alt px-4 py-3 t-small text-fg/85">Subscreva a newsletter para saber quando voltar a estar disponível.</p>
                )}
              </div>
            </div>

            <section className="mt-12 border-t border-line pt-10" aria-labelledby="sinopse">
              <h2 id="sinopse" className="t-h3">Sinopse</h2>
              <div className="prose-editorial mt-4 max-w-prose">
                <p className="text-lg !text-fg/90">{book.synopsis}</p>
                {book.description && <p>{book.description}</p>}
              </div>
            </section>

            <section className="mt-10" aria-labelledby="ficha">
              <h2 id="ficha" className="t-h3">Ficha técnica</h2>
              <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-4">
                {details.map(([k, v]) => (
                  <div key={k} className="bg-surface px-4 py-3.5">
                    <dt className="t-caption">{k}</dt>
                    <dd className="mt-1 break-words t-small font-medium text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="container-page section" aria-labelledby="relacionados">
          <SectionHeader id="relacionados" eyebrow="Continue a ler" title="Também pode gostar" />
          <BookGrid books={related} />
        </section>
      )}
    </>
  );
}
