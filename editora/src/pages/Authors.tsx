import { AuthorCard } from '../components/book/AuthorCard';
import { EmptyState, Spinner } from '../components/ui/Feedback';
import { useCatalog } from '../context/CatalogContext';
import { useSeo } from '../lib/seo';

export default function Authors() {
  const { authors, books, loading } = useCatalog();
  useSeo({ title: 'Autores', description: 'Conheça os autores publicados pela editora.' });
  if (loading) return <Spinner />;

  return (
    <div className="container-page py-12 sm:py-16">
      <p className="eyebrow">Quem escreve</p>
      <h1 className="mt-3 text-4xl font-medium sm:text-5xl">Autores</h1>
      <div className="mt-12">
        {authors.length === 0 ? (
          <EmptyState title="Ainda sem autores publicados" />
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
            {authors.map((a) => (
              <AuthorCard key={a.id} author={a} bookCount={books.filter((b) => b.authorId === a.id).length} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
