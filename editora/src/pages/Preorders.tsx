import { PreorderCard } from '../components/book/PreorderCard';
import { EmptyState, Notice, Spinner } from '../components/ui/Feedback';
import { ButtonLink } from '../components/ui/Button';
import { useCatalog } from '../context/CatalogContext';
import { getPreorderState } from '../lib/preorder';
import type { PreorderState } from '../types';
import { useSeo } from '../lib/seo';

const order: PreorderState[] = ['aberta', 'em_breve', 'esgotada', 'encerrada'];

export default function Preorders() {
  const { preorders, bookById, loading, error } = useCatalog();
  useSeo({ title: 'Pré-venda', description: 'Reserve os próximos lançamentos da editora com preço especial e envio garantido.' });

  if (loading) return <Spinner />;

  const groups = order
    .map((state) => ({
      state,
      items: preorders.filter((p) => getPreorderState(p) === state).sort((a, b) => a.endsAt.localeCompare(b.endsAt)),
    }))
    .filter((g) => g.items.length > 0);

  const titles: Record<PreorderState, string> = {
    aberta: 'Abertas agora',
    em_breve: 'Em breve',
    esgotada: 'Esgotadas',
    encerrada: 'Encerradas',
  };

  return (
    <div className="container-page py-12 sm:py-16">
      <p className="eyebrow">Reserve antes do lançamento</p>
      <h1 className="mt-3 text-4xl font-medium sm:text-5xl">Pré-venda</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-700">
        Garanta o seu exemplar antes de chegar às livrarias, com preço especial e benefícios exclusivos. Só é cobrado o valor da reserva — e pode cancelar até ao envio.
      </p>

      {error && <Notice tone="error" className="mt-8">{error}</Notice>}

      {groups.length === 0 ? (
        <div className="mt-12">
          <EmptyState title="Sem pré-vendas de momento" action={<ButtonLink to="/livros">Ver catálogo</ButtonLink>}>
            Subscreva a newsletter para saber quando abrir a próxima.
          </EmptyState>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.state} className="mt-14" aria-labelledby={`grupo-${g.state}`}>
            <h2 id={`grupo-${g.state}`} className="mb-6 border-b border-ink-100 pb-3 text-2xl font-medium">
              {titles[g.state]}
            </h2>
            <div className="grid gap-5 lg:grid-cols-2">
              {g.items.map((p) => {
                const book = bookById(p.bookId);
                return book ? <PreorderCard key={p.id} book={book} preorder={p} /> : null;
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
