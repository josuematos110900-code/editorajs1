import { useParams } from 'react-router-dom';
import { AuthorPortrait } from '../components/book/AuthorCard';
import { BookCard } from '../components/book/BookCard';
import { PreorderCard } from '../components/book/PreorderCard';
import { DemoBadge, Spinner } from '../components/ui/Feedback';
import { useCatalog } from '../context/CatalogContext';
import { getPreorderState } from '../lib/preorder';
import { absoluteUrl, useSeo } from '../lib/seo';
import NotFound from './NotFound';

export default function AuthorPage() {
  const { slug = '' } = useParams();
  const { loading, authorBySlug, books, preorderFor } = useCatalog();
  const author = authorBySlug(slug);

  useSeo({
    title: author?.name,
    description: author?.bio,
    image: author?.photoUrl,
    path: author ? `/autores/${author.slug}` : undefined,
    type: 'profile',
    jsonLd: author
      ? { '@context': 'https://schema.org', '@type': 'Person', name: author.name, description: author.bio, url: absoluteUrl(`/autores/${author.slug}`) }
      : undefined,
  });

  if (loading) return <Spinner />;
  if (!author) return <NotFound />;

  const own = books.filter((b) => b.authorId === author.id);
  const inPreorder = own.filter((b) => {
    const p = preorderFor(b.id);
    return p && ['aberta', 'em_breve'].includes(getPreorderState(p));
  });
  const published = own.filter((b) => !inPreorder.includes(b));

  return (
    <div className="container-page py-12 sm:py-16">
      <header className="grid items-center gap-8 border-b border-ink-100 pb-12 sm:grid-cols-[12rem_1fr] sm:gap-12">
        <AuthorPortrait author={author} className="mx-auto w-40 sm:w-48" />
        <div>
          <p className="eyebrow">Autor{author.isDemo && <DemoBadge className="ml-3 align-middle" />}</p>
          <h1 className="mt-3 text-4xl font-medium sm:text-5xl">{author.name}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-700">{author.bio}</p>
        </div>
      </header>

      {inPreorder.length > 0 && (
        <section className="mt-14" aria-labelledby="autor-pre-venda">
          <h2 id="autor-pre-venda" className="mb-6 text-2xl font-medium">Em pré-venda</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {inPreorder.map((b) => (
              <PreorderCard key={b.id} book={b} preorder={preorderFor(b.id)!} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-14" aria-labelledby="autor-livros">
        <h2 id="autor-livros" className="mb-8 text-2xl font-medium">Livros publicados</h2>
        {published.length === 0 ? (
          <p className="text-ink-500">Ainda sem livros publicados.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 md:grid-cols-4">
            {published.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
