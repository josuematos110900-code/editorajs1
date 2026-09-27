import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { BookGrid } from '../components/book/BookCard';
import { FilterGroup, FilterPanel } from '../components/book/FilterPanel';
import { Button } from '../components/ui/Button';
import { BookGridSkeleton, EmptyState, Notice } from '../components/ui/Feedback';
import { Pagination } from '../components/ui/Pagination';
import { useCatalog } from '../context/CatalogContext';
import { cn } from '../lib/cn';
import { catalogFormatLabels, filterBooks, priceRanges, type CatalogFilters, type CatalogFormat, type PriceRange, type SortKey } from '../lib/catalogFilter';
import { availabilityLabels, type Availability } from '../lib/preorder';
import { useSeo } from '../lib/seo';

const PAGE_SIZE = 12;

const sortLabels: Record<SortKey, string> = {
  recentes: 'Lançamento: mais recentes',
  antigos: 'Lançamento: mais antigos',
  titulo: 'Título (A–Z)',
  preco_asc: 'Preço: mais baixo',
  preco_desc: 'Preço: mais alto',
};

const FILTER_KEYS = ['q', 'genero', 'autor', 'disponibilidade', 'formato', 'preco'] as const;

export default function Catalog() {
  const { books, authors, categories, loading, error, preorderFor, digitalFiles } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [panelOpen, setPanelOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const filters: CatalogFilters = {
    q: params.get('q') ?? '',
    genero: params.get('genero') ?? '',
    autor: params.get('autor') ?? '',
    disponibilidade: (params.get('disponibilidade') as Availability | null) ?? '',
    formato: (params.get('formato') as CatalogFormat | null) ?? '',
    preco: (params.get('preco') as PriceRange | null) ?? '',
    ordem: (params.get('ordem') as SortKey | null) ?? 'recentes',
  };
  const page = Math.max(1, Number(params.get('pagina')) || 1);

  useSeo({ title: 'Catálogo', description: 'Pesquise e filtre os livros da editora por género, autor, formato, preço e disponibilidade.' });

  useEffect(() => {
    if (params.get('focus') === 'pesquisa') searchRef.current?.focus();
  }, [params]);

  const categorySlugToId = useMemo(() => new Map(categories.map((c) => [c.slug, c.id])), [categories]);
  const result = useMemo(
    () => filterBooks(books, filters, { authors, categorySlugToId, preorderFor, digitalFiles }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [books, authors, categorySlugToId, preorderFor, digitalFiles, params],
  );
  const pages = Math.max(1, Math.ceil(result.length / PAGE_SIZE));
  const visible = result.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.delete('focus');
    next.delete('pagina');
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  function goTo(p: number) {
    const next = new URLSearchParams(params);
    next.set('pagina', String(p));
    setParams(next);
    window.scrollTo({ top: 0 });
  }

  const activeCount = FILTER_KEYS.filter((k) => k !== 'q' && params.get(k)).length;
  const clear = () => setParams({}, { replace: true });

  // Renderizado duas vezes (lateral no computador, recolhível no telemóvel):
  // cada instância tem nomes de rádio próprios para os grupos não se misturarem.
  const renderPanel = (scope: string) => (
    <FilterPanel>
      <FilterGroup legend="Disponibilidade" name={`${scope}-disponibilidade`} value={filters.disponibilidade} onChange={(v) => update('disponibilidade', v)}
        options={(Object.keys(availabilityLabels) as Availability[]).map((k) => ({ value: k, label: availabilityLabels[k] }))} />
      <FilterGroup legend="Género" name={`${scope}-genero`} value={filters.genero} onChange={(v) => update('genero', v)}
        options={categories.map((c) => ({ value: c.slug, label: c.name, count: books.filter((b) => b.categoryId === c.id).length }))} />
      <FilterGroup legend="Autor" name={`${scope}-autor`} value={filters.autor} onChange={(v) => update('autor', v)}
        options={authors.map((a) => ({ value: a.slug, label: a.name, count: books.filter((b) => b.authorId === a.id).length }))} />
      <FilterGroup legend="Formato" name={`${scope}-formato`} value={filters.formato} onChange={(v) => update('formato', v)}
        options={(Object.keys(catalogFormatLabels) as CatalogFormat[]).map((f) => ({ value: f, label: catalogFormatLabels[f] }))} />
      <FilterGroup legend="Preço" name={`${scope}-preco`} value={filters.preco} onChange={(v) => update('preco', v)}
        options={(Object.keys(priceRanges) as PriceRange[]).map((k) => ({ value: k, label: priceRanges[k].label }))} />
    </FilterPanel>
  );

  return (
    <div className="page">
      <p className="eyebrow">Livraria</p>
      <h1 className="t-h1 mt-3">Catálogo</h1>

      <form role="search" className="mt-8 max-w-2xl" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="pesquisa" className="sr-only">Pesquisar por título, autor ou ISBN</label>
        <div className="relative">
          <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            ref={searchRef}
            id="pesquisa"
            type="search"
            value={filters.q}
            onChange={(e) => update('q', e.target.value)}
            placeholder="Pesquisar por título, autor ou ISBN"
            className="input h-14 pl-12 text-base"
          />
        </div>
      </form>

      <div className="mt-10 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10">
        <aside className="hidden lg:block" aria-label="Filtros do catálogo">{renderPanel('lateral')}</aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" className="lg:hidden" aria-expanded={panelOpen} aria-controls="filtros-movel" onClick={() => setPanelOpen((v) => !v)}>
                <SlidersHorizontal size={15} aria-hidden="true" /> Filtros{activeCount > 0 && ` (${activeCount})`}
              </Button>
              <p className="t-small text-muted" role="status" aria-live="polite">
                {loading ? 'A carregar…' : `${result.length} ${result.length === 1 ? 'livro' : 'livros'}`}
              </p>
              {(activeCount > 0 || filters.q) && (
                <Button variant="tertiary" size="sm" onClick={clear}>
                  <X size={14} aria-hidden="true" /> Limpar
                </Button>
              )}
            </div>
            <label className="flex items-center gap-2 t-small text-muted">
              <span className="hidden sm:inline">Ordenar</span>
              <select value={filters.ordem} onChange={(e) => update('ordem', e.target.value)} className="input !min-h-10 !w-auto !py-2 pr-8 t-small" aria-label="Ordenar livros">
                {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                  <option key={k} value={k}>{sortLabels[k]}</option>
                ))}
              </select>
            </label>
          </div>

          <div id="filtros-movel" className={cn('mt-4 lg:hidden', panelOpen ? 'block animate-slide-in' : 'hidden')}>
            {renderPanel('movel')}
            <Button className="mt-3 w-full" onClick={() => setPanelOpen(false)}>Ver {result.length} {result.length === 1 ? 'livro' : 'livros'}</Button>
          </div>

          <div className="mt-8">
            {error ? (
              <Notice tone="error" title="Não foi possível carregar o catálogo">{error}</Notice>
            ) : loading ? (
              <BookGridSkeleton />
            ) : result.length === 0 ? (
              <EmptyState title="Nenhum livro encontrado" action={<Button variant="secondary" onClick={clear}>Ver catálogo completo</Button>}>
                Não há livros com esta combinação de pesquisa e filtros.
              </EmptyState>
            ) : (
              <>
                <BookGrid books={visible} priorityCount={4} narrow />
                <Pagination page={Math.min(page, pages)} pages={pages} onChange={goTo} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
