import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { BookCard } from '../components/book/BookCard';
import { EmptyState, Notice, Spinner } from '../components/ui/Feedback';
import { Button } from '../components/ui/Button';
import { useCatalog } from '../context/CatalogContext';
import { filterBooks, type CatalogFilters, type SortKey } from '../lib/catalogFilter';
import { availabilityLabels, type Availability } from '../lib/preorder';
import { useSeo } from '../lib/seo';

const sortLabels: Record<SortKey, string> = {
  recentes: 'Lançamento: mais recentes',
  antigos: 'Lançamento: mais antigos',
  titulo: 'Título (A–Z)',
  preco_asc: 'Preço: mais baixo',
  preco_desc: 'Preço: mais alto',
};

export default function Catalog() {
  const { books, authors, categories, loading, error, preorderFor } = useCatalog();
  const [params, setParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  const filters: CatalogFilters = {
    q: params.get('q') ?? '',
    genero: params.get('genero') ?? '',
    autor: params.get('autor') ?? '',
    disponibilidade: (params.get('disponibilidade') as Availability | null) ?? '',
    ordem: (params.get('ordem') as SortKey | null) ?? 'recentes',
  };

  useSeo({ title: 'Catálogo', description: 'Pesquise e filtre todos os livros da editora por género, autor e disponibilidade.' });

  useEffect(() => {
    if (params.get('focus') === 'pesquisa') searchRef.current?.focus();
  }, [params]);

  const categorySlugToId = useMemo(() => new Map(categories.map((c) => [c.slug, c.id])), [categories]);
  const result = useMemo(
    () => filterBooks(books, filters, { authors, categorySlugToId, preorderFor }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [books, authors, categorySlugToId, preorderFor, params],
  );

  function update(key: keyof CatalogFilters, value: string) {
    const next = new URLSearchParams(params);
    next.delete('focus');
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const activeFilters = Boolean(filters.q || filters.genero || filters.autor || filters.disponibilidade);

  return (
    <div className="container-page py-12 sm:py-16">
      <p className="eyebrow">Livraria</p>
      <h1 className="mt-3 text-4xl font-medium sm:text-5xl">Catálogo</h1>

      <form role="search" className="mt-8" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="pesquisa" className="sr-only">
          Pesquisar por título, autor ou ISBN
        </label>
        <div className="relative">
          <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input
            ref={searchRef}
            id="pesquisa"
            type="search"
            value={filters.q}
            onChange={(e) => update('q', e.target.value)}
            placeholder="Pesquisar por título, autor ou ISBN"
            className="h-14 w-full rounded-lg border border-ink-200 bg-white pl-12 pr-4 text-base focus:border-seal-600 focus:outline-none focus:ring-2 focus:ring-seal-600/20"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FilterSelect label="Género" value={filters.genero} onChange={(v) => update('genero', v)}>
            <option value="">Todos os géneros</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Autor" value={filters.autor} onChange={(v) => update('autor', v)}>
            <option value="">Todos os autores</option>
            {authors.map((a) => (
              <option key={a.id} value={a.slug}>
                {a.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Disponibilidade" value={filters.disponibilidade} onChange={(v) => update('disponibilidade', v)}>
            <option value="">Qualquer disponibilidade</option>
            {(Object.keys(availabilityLabels) as Availability[]).map((k) => (
              <option key={k} value={k}>
                {availabilityLabels[k]}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Ordenar" value={filters.ordem} onChange={(v) => update('ordem', v)}>
            {(Object.keys(sortLabels) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {sortLabels[k]}
              </option>
            ))}
          </FilterSelect>
        </div>
      </form>

      <div className="mt-8 flex items-center justify-between gap-4 border-b border-ink-100 pb-4">
        <p className="text-sm text-ink-600" role="status" aria-live="polite">
          {loading ? 'A carregar…' : `${result.length} ${result.length === 1 ? 'livro' : 'livros'}`}
        </p>
        {activeFilters && (
          <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
            <X size={15} aria-hidden="true" /> Limpar filtros
          </Button>
        )}
      </div>

      <div className="mt-10">
        {loading ? (
          <Spinner />
        ) : error ? (
          <Notice tone="error">{error}</Notice>
        ) : result.length === 0 ? (
          <EmptyState title="Nenhum livro encontrado">Experimente outra pesquisa ou remova alguns filtros.</EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4">
            {result.map((b, i) => (
              <BookCard key={b.id} book={b} priority={i < 4} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  const id = `filtro-${label.toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {children}
      </select>
    </div>
  );
}
