import { AuthorCard } from '../components/book/AuthorCard';
import { EmptyState, Spinner } from '../components/ui/Feedback';
import { useCatalog } from '../context/CatalogContext';
import { useSeo } from '../lib/seo';

export default function Authors() {
  const { authors, books, loading } = useCatalog();
  useSeo({ title: 'Autores', description: 'Conheça os autores publicados pela editora.' });
  if (loading) return <Spinner />;

  return (
    <div className="page">
      <p className="eyebrow">Quem escreve</p>
      <h1 className="t-h1 mt-3">Autores</h1>
      <p className="t-lead mt-4 max-w-prose">As vozes que publicamos — da história local à poesia, da sala de aula ao romance.</p>
      <div className="mt-12">
        {authors.length === 0 ? (
          <EmptyState title="Ainda sem autores publicados" />
        ) : (
          <div className="grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((a) => {
              const own = books.filter((b) => b.authorId === a.id).sort((x, y) => (y.publicationDate ?? '').localeCompare(x.publicationDate ?? ''));
              return <AuthorCard key={a.id} author={a} bookCount={own.length} latestTitle={own[0]?.title} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
