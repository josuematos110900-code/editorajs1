import { useParams } from 'react-router-dom';
import { AuthorHero } from '../components/book/AuthorCard';
import { BookGrid } from '../components/book/BookCard';
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
    <div className="page">
      <AuthorHero author={author}>{author.isDemo && <DemoBadge />}</AuthorHero>

      {inPreorder.length > 0 && (
        <section className="mt-12" aria-labelledby="autor-pre-venda">
          <h2 id="autor-pre-venda" className="t-h3 mb-6">Em pré-venda</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {inPreorder.map((b) => (
              <PreorderCard key={b.id} book={b} preorder={preorderFor(b.id)!} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12" aria-labelledby="autor-livros">
        <h2 id="autor-livros" className="t-h3 mb-8">Livros publicados</h2>
        {published.length === 0 ? (
          <p className="text-muted">Ainda sem livros publicados.</p>
        ) : (
          <BookGrid books={published} />
        )}
      </section>
    </div>
  );
}
