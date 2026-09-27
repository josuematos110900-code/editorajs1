import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AvailabilityBadge } from '../components/book/Badges';
import { BookCard } from '../components/book/BookCard';
import { BookCover } from '../components/book/BookCover';
import { BuyBox } from '../components/book/BuyBox';
import { Price } from '../components/book/Price';
import { ButtonLink } from '../components/ui/Button';
import { DemoBadge, Spinner } from '../components/ui/Feedback';
import { useCatalog } from '../context/CatalogContext';
import { site } from '../config/site';
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
  const related = books
    .filter((b) => b.id !== book.id && (b.categoryId === book.categoryId || b.authorId === book.authorId))
    .slice(0, 4);

  const details: [string, React.ReactNode][] = [
    ['Autor', author ? <Link key="autor" to={`/autores/${author.slug}`} className="underline underline-offset-2 hover:text-seal-700">{author.name}</Link> : '—'],
    ['Género', category ? <Link key="genero" to={`/livros?genero=${category.slug}`} className="underline underline-offset-2 hover:text-seal-700">{category.name}</Link> : '—'],
    ['Páginas', book.pages ?? '—'],
    ['ISBN', book.isbn ?? '—'],
    ['Editora', book.publisher || site.name],
    ['Data de publicação', formatDate(book.publicationDate)],
    ['Formato', book.formats.map((f) => formatLabels[f]).join(', ')],
  ];

  return (
    <>
      <div className="container-page py-10 sm:py-14">
        <nav aria-label="Caminho" className="mb-8 text-sm text-ink-500">
          <ol className="flex flex-wrap gap-2">
            <li><Link to="/livros" className="hover:text-ink-900">Catálogo</Link> /</li>
            {category && <li><Link to={`/livros?genero=${category.slug}`} className="hover:text-ink-900">{category.name}</Link> /</li>}
            <li aria-current="page" className="text-ink-800">{book.title}</li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
          <div>
            <div className="mx-auto max-w-[13rem] sm:max-w-sm lg:max-w-none">
              {images.length > 0 ? (
                <BookCover book={{ ...book, coverUrl: images[image] }} authorName={author?.name} size="lg" priority />
              ) : (
                <BookCover book={book} authorName={author?.name} size="lg" priority />
              )}
            </div>
            {images.length > 1 && (
              <ul className="mt-4 flex gap-3" aria-label="Galeria de imagens">
                {images.map((src, i) => (
                  <li key={src}>
                    <button type="button" onClick={() => setImage(i)} aria-label={`Ver imagem ${i + 1}`} aria-pressed={i === image} className={`block w-16 overflow-hidden rounded border-2 ${i === image ? 'border-ink-900' : 'border-transparent'}`}>
                      <img src={src} alt="" loading="lazy" className="aspect-[2/3] w-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <AvailabilityBadge availability={availability} />
              {book.isDemo && <DemoBadge />}
            </div>
            <h1 className="mt-4 text-4xl font-medium leading-tight sm:text-5xl">{book.title}</h1>
            {book.subtitle && <p className="mt-2 text-xl text-ink-600">{book.subtitle}</p>}
            {author && (
              <p className="mt-3 text-lg">
                de <Link to={`/autores/${author.slug}`} className="font-medium underline decoration-ink-300 underline-offset-4 hover:decoration-seal-700">{author.name}</Link>
              </p>
            )}

            <Price value={price} previous={price < book.price ? book.price : book.compareAtPrice} size="lg" className="mt-8" />

            <div className="mt-6 max-w-md">
              {availability === 'pre_venda' || availability === 'brevemente' ? (
                <div className="rounded-lg border border-seal-600/20 bg-seal-50 p-5">
                  <p className="font-medium text-seal-800">
                    {availability === 'pre_venda' ? 'Este livro está em pré-venda.' : 'Este livro ainda não foi lançado.'}
                  </p>
                  <p className="mt-1 text-sm text-ink-600">Veja a data de lançamento, a previsão de entrega e os benefícios da reserva.</p>
                  <ButtonLink to={`/pre-venda/${book.slug}`} className="mt-4">
                    Ver pré-venda <ArrowRight size={16} aria-hidden="true" />
                  </ButtonLink>
                </div>
              ) : availability === 'disponivel' ? (
                <>
                  <BuyBox book={book} ctaLabel="Comprar agora" />
                  {book.stock <= 5 && <p className="text-sm font-medium text-seal-700">Últimos {book.stock} exemplares.</p>}
                </>
              ) : (
                <p className="rounded-md bg-ink-100 px-4 py-3 text-sm text-ink-700">Esgotado de momento. Subscreva a newsletter para saber quando voltar.</p>
              )}
            </div>

            <div className="prose-editorial mt-10 max-w-2xl border-t border-ink-100 pt-8">
              <h2 className="mb-4 text-2xl font-medium">Sinopse</h2>
              <p className="text-lg">{book.synopsis}</p>
              {book.description && <p>{book.description}</p>}
            </div>

            <dl className="mt-8 grid max-w-2xl grid-cols-1 gap-x-8 border-t border-ink-100 pt-8 text-sm sm:grid-cols-2">
              {details.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-ink-100 py-2.5">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="text-right font-medium text-ink-900">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-b border-ink-100 py-2.5">
                <dt className="text-ink-500">Disponibilidade</dt>
                <dd className="text-right font-medium text-ink-900">
                  {availability === 'disponivel' ? `${book.stock} em stock` : availability === 'pre_venda' ? 'Pré-venda' : availability === 'brevemente' ? 'Brevemente' : 'Esgotado'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="container-page mt-10" aria-labelledby="relacionados">
          <h2 id="relacionados" className="mb-8 border-b border-ink-100 pb-4 text-3xl font-medium">
            Também pode gostar
          </h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 md:grid-cols-4">
            {related.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
