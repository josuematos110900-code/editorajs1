import { Link, Navigate, useParams } from 'react-router-dom';
import { CalendarClock, CalendarDays, Check, Package, ShieldCheck, Truck } from 'lucide-react';
import { PreorderBadge } from '../components/book/Badges';
import { BookCover } from '../components/book/BookCover';
import { BuyBox } from '../components/book/BuyBox';
import { Countdown } from '../components/book/Countdown';
import { Price } from '../components/book/Price';
import { ButtonLink } from '../components/ui/Button';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { DemoBadge, Spinner } from '../components/ui/Feedback';
import { site } from '../config/site';
import { useCatalog } from '../context/CatalogContext';
import { formatDate, formatLabels, formatMoney } from '../lib/format';
import { getPreorderState, preorderBenefits, remainingUnits } from '../lib/preorder';
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
            inLanguage: book.language,
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
  const benefits = preorderBenefits(book, preorder, formatMoney);
  const progress = preorder.unitLimit ? Math.min(100, Math.round((preorder.reserved / preorder.unitLimit) * 100)) : null;

  return (
    <div className="page">
      <Breadcrumb items={[{ label: 'Pré-vendas', to: '/pre-venda' }, { label: book.title }]} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-16">
        <div className="mx-auto w-full max-w-[13rem] sm:max-w-[18rem] lg:sticky lg:top-24 lg:max-w-none lg:self-start">
          <BookCover book={book} authorName={author?.name} size="lg" priority />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PreorderBadge state={state} />
            {book.isDemo && <DemoBadge />}
          </div>
          <h1 className="t-h1 mt-4">{book.title}</h1>
          {author && (
            <p className="mt-3 text-lg text-muted">
              de <Link to={`/autores/${author.slug}`} className="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-primary">{author.name}</Link>
            </p>
          )}

          {/* Bloco de compra: preço, datas, contador, disponibilidade e CTA */}
          <div className="card mt-8 p-5 sm:p-7">
            <Price value={preorder.specialPrice} previous={book.price} size="lg" />
            <p className="mt-1 t-small text-muted">Preço especial de pré-venda · IVA incluído</p>

            <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-4 t-small">
              <div>
                <dt className="t-caption flex items-center gap-1.5"><CalendarDays size={13} aria-hidden="true" /> Lançamento</dt>
                <dd className="mt-1 font-medium text-fg">{formatDate(book.publicationDate)}</dd>
              </div>
              <div>
                <dt className="t-caption flex items-center gap-1.5"><CalendarClock size={13} aria-hidden="true" /> {state === 'em_breve' ? 'Abre a' : 'Pré-venda até'}</dt>
                <dd className="mt-1 font-medium text-fg">{formatDate(state === 'em_breve' ? preorder.startsAt : preorder.endsAt)}</dd>
              </div>
            </dl>

            {(state === 'aberta' || state === 'em_breve') && (
              <Countdown className="mt-5" to={state === 'aberta' ? preorder.endsAt : preorder.startsAt} label={state === 'aberta' ? 'A pré-venda termina em' : 'A pré-venda abre em'} />
            )}

            {progress !== null && state !== 'em_breve' && (
              <div className="mt-5">
                <div className="flex justify-between t-small">
                  <span className="text-muted">{preorder.reserved} reservados</span>
                  <span className="font-medium text-fg">{left === 0 ? 'Esgotado' : `Restam ${left} de ${preorder.unitLimit}`}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-alt" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Exemplares reservados">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="mt-6">
              {state === 'aberta' ? (
                <BuyBox book={book} preorder={preorder} ctaLabel="Reservar livro" />
              ) : state === 'em_breve' ? (
                <p className="rounded-md bg-warning-soft px-4 py-3 t-small text-warning">
                  A pré-venda abre a <strong>{formatDate(preorder.startsAt)}</strong>. Subscreva a newsletter para ser avisado.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="rounded-md bg-surface-alt px-4 py-3 t-small text-fg/85">
                    {state === 'esgotada' ? 'Todos os exemplares de pré-venda foram reservados.' : 'A pré-venda deste livro está encerrada.'}
                  </p>
                  <ButtonLink to={`/livros/${book.slug}`} variant="secondary">Ver livro</ButtonLink>
                </div>
              )}
            </div>
            <p className="mt-4 flex items-start gap-2 t-small text-muted">
              <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Pode cancelar até ao envio.{' '}
                <Link to="/informacoes/pre-venda" className="underline underline-offset-2 hover:text-fg">Política de pré-venda</Link>
              </span>
            </p>
          </div>

          <section className="mt-12" aria-labelledby="beneficios">
            <h2 id="beneficios" className="t-h3">O que inclui a pré-venda</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {benefits.map((b) => (
                <li key={b} className="flex gap-3 rounded-md border border-line bg-surface p-4 t-small text-fg">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                    <Check size={13} aria-hidden="true" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12 border-t border-line pt-10" aria-labelledby="sinopse">
            <h2 id="sinopse" className="t-h3">Sinopse</h2>
            <div className="prose-editorial mt-4 max-w-prose">
              <p className="text-lg !text-fg/90">{book.synopsis}</p>
              {book.description && <p>{book.description}</p>}
            </div>
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 t-small">
              <Fact icon={<Package size={14} />} label="Formatos" value={book.formats.map((f) => formatLabels[f]).join(', ')} />
              <Fact icon={<Truck size={14} />} label="Envio previsto" value={formatDate(preorder.expectedShipDate)} />
            </dl>
            <Link to={`/livros/${book.slug}`} className="mt-4 inline-flex min-h-11 items-center t-small font-semibold underline underline-offset-4 hover:text-primary">
              Ficha técnica completa
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="t-caption flex items-center gap-1.5"><span aria-hidden="true">{icon}</span>{label}</dt>
      <dd className="mt-1 font-medium text-fg">{value}</dd>
    </div>
  );
}
