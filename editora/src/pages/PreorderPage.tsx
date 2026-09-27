import { Link, Navigate, useParams } from 'react-router-dom';
import { CalendarDays, Check, Package, Truck } from 'lucide-react';
import { PreorderBadge } from '../components/book/Badges';
import { BookCover } from '../components/book/BookCover';
import { BuyBox } from '../components/book/BuyBox';
import { Countdown } from '../components/book/Countdown';
import { Price } from '../components/book/Price';
import { ButtonLink } from '../components/ui/Button';
import { DemoBadge, Spinner } from '../components/ui/Feedback';
import { site } from '../config/site';
import { useCatalog } from '../context/CatalogContext';
import { formatDate, formatLabels } from '../lib/format';
import { getPreorderState, remainingUnits } from '../lib/preorder';
import { absoluteUrl, useSeo } from '../lib/seo';
import NotFound from './NotFound';

export default function PreorderPage() {
  const { slug = '' } = useParams();
  const { loading, bookBySlug, authorById, preorderFor } = useCatalog();
  const book = bookBySlug(slug);
  const preorder = book ? preorderFor(book.id) : undefined;
  const author = book ? authorById(book.authorId) : undefined;
  const state = preorder ? getPreorderState(preorder) : 'encerrada';

  useSeo({
    title: book ? `Pré-venda: ${book.title}` : undefined,
    description: book ? `Reserve «${book.title}»${author ? `, de ${author.name}` : ''}, com preço especial de pré-venda. ${book.synopsis}` : undefined,
    image: book?.coverUrl,
    path: book ? `/pre-venda/${book.slug}` : undefined,
    type: 'book',
    jsonLd:
      book && preorder
        ? {
            '@context': 'https://schema.org',
            '@type': 'Book',
            name: book.title,
            author: author ? { '@type': 'Person', name: author.name } : undefined,
            datePublished: book.publicationDate ?? undefined,
            offers: {
              '@type': 'Offer',
              price: preorder.specialPrice,
              priceCurrency: site.currency.code,
              availability: state === 'aberta' ? 'https://schema.org/PreOrder' : 'https://schema.org/SoldOut',
              availabilityStarts: preorder.startsAt,
              availabilityEnds: preorder.endsAt,
              url: absoluteUrl(`/pre-venda/${book.slug}`),
            },
          }
        : undefined,
  });

  if (loading) return <Spinner />;
  if (!book) return <NotFound />;
  if (!preorder) return <Navigate to={`/livros/${book.slug}`} replace />;

  const left = remainingUnits(preorder);
  const benefits = preorder.benefits.length ? preorder.benefits : site.texts.preorderDefaultBenefits;
  const progress = preorder.unitLimit ? Math.min(100, Math.round((preorder.reserved / preorder.unitLimit) * 100)) : null;

  return (
    <div className="container-page py-10 sm:py-14">
      <nav aria-label="Caminho" className="mb-8 text-sm text-ink-500">
        <ol className="flex flex-wrap gap-2">
          <li><Link to="/pre-venda" className="hover:text-ink-900">Pré-venda</Link> /</li>
          <li aria-current="page" className="text-ink-800">{book.title}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-16">
        <div className="mx-auto w-full max-w-[13rem] sm:max-w-sm lg:sticky lg:top-24 lg:self-start">
          <BookCover book={book} authorName={author?.name} size="lg" priority />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <PreorderBadge state={state} />
            {book.isDemo && <DemoBadge />}
          </div>
          <h1 className="mt-4 text-4xl font-medium leading-tight sm:text-5xl">{book.title}</h1>
          {author && (
            <p className="mt-3 text-lg">
              de <Link to={`/autores/${author.slug}`} className="font-medium underline decoration-ink-300 underline-offset-4 hover:decoration-seal-700">{author.name}</Link>
            </p>
          )}
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-700">{book.synopsis}</p>

          <div className="mt-8 rounded-xl border border-ink-100 bg-white p-6 sm:p-8">
            <Price value={preorder.specialPrice} previous={book.price} size="lg" />
            <p className="mt-1 text-sm text-ink-500">Preço especial de pré-venda · IVA incluído</p>

            <div className="mt-6">
              {state === 'aberta' && <Countdown to={preorder.endsAt} label="A pré-venda termina em" />}
              {state === 'em_breve' && <Countdown to={preorder.startsAt} label="A pré-venda abre em" />}
            </div>

            {progress !== null && state !== 'em_breve' && (
              <div className="mt-6">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-600">{preorder.reserved} reservados</span>
                  <span className="font-medium text-ink-900">{left === 0 ? 'Esgotado' : `Restam ${left} de ${preorder.unitLimit}`}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Exemplares reservados">
                  <div className="h-full rounded-full bg-seal-700" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="mt-6">
              {state === 'aberta' ? (
                <BuyBox book={book} preorder={preorder} ctaLabel="Reservar agora" />
              ) : state === 'em_breve' ? (
                <p className="rounded-md bg-gilt-100 px-4 py-3 text-sm text-ink-800">
                  A pré-venda abre a <strong>{formatDate(preorder.startsAt)}</strong>. Subscreva a newsletter para ser avisado.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="rounded-md bg-ink-100 px-4 py-3 text-sm text-ink-700">
                    {state === 'esgotada' ? 'Todos os exemplares de pré-venda foram reservados.' : 'A pré-venda deste livro está encerrada.'}
                  </p>
                  <ButtonLink to={`/livros/${book.slug}`} variant="secondary">Ver página do livro</ButtonLink>
                </div>
              )}
            </div>
          </div>

          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            <Fact icon={<CalendarDays size={18} />} label="Lançamento" value={formatDate(book.publicationDate)} />
            <Fact icon={<Truck size={18} />} label="Envio previsto" value={formatDate(preorder.expectedShipDate)} />
            <Fact icon={<Package size={18} />} label="Formatos" value={book.formats.map((f) => formatLabels[f]).join(', ')} />
          </dl>

          <section className="mt-10 border-t border-ink-100 pt-8" aria-labelledby="beneficios">
            <h2 id="beneficios" className="text-2xl font-medium">Benefícios da pré-venda</h2>
            <ul className="mt-5 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex gap-3 text-ink-800">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-leaf-700">
                    <Check size={13} aria-hidden="true" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-ink-500">
              Pode cancelar a reserva até ao envio. <Link to="/informacoes/pre-venda" className="underline underline-offset-2">Política de pré-venda</Link>
            </p>
          </section>

          {book.description && (
            <section className="prose-editorial mt-10 border-t border-ink-100 pt-8">
              <h2 className="mb-4 text-2xl font-medium">Sobre o livro</h2>
              <p>{book.description}</p>
              <Link to={`/livros/${book.slug}`} className="text-sm font-semibold underline underline-offset-2">Ficha técnica completa</Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-4">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
        <span aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1.5 font-medium text-ink-900">{value}</dd>
    </div>
  );
}
