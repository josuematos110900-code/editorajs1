import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Catalog } from '../data';
import type { Author, Book, Category, DigitalFile, DigitalKind, Preorder } from '../types';

interface CatalogValue extends Catalog {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  bookBySlug: (slug: string) => Book | undefined;
  bookById: (id: string) => Book | undefined;
  authorById: (id: string) => Author | undefined;
  authorBySlug: (slug: string) => Author | undefined;
  categoryById: (id: string | null) => Category | undefined;
  preorderFor: (bookId: string) => Preorder | undefined;
  filesFor: (bookId: string, kind?: DigitalKind) => DigitalFile[];
}

const CatalogContext = createContext<CatalogValue | undefined>(undefined);

const empty: Catalog = { books: [], authors: [], categories: [], preorders: [], digitalFiles: [] };

/**
 * O catálogo público é carregado uma vez e partilhado por todas as páginas
 * (uma editora tem centenas de títulos, não milhões) — navegação instantânea
 * entre catálogo, livro e autor sem pedidos repetidos.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setCatalog(await api.getCatalog());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o catálogo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<CatalogValue>(() => {
    const books = new Map(catalog.books.map((b) => [b.id, b]));
    const authors = new Map(catalog.authors.map((a) => [a.id, a]));
    const categories = new Map(catalog.categories.map((c) => [c.id, c]));
    const preorders = new Map(catalog.preorders.map((p) => [p.bookId, p]));
    return {
      ...catalog,
      loading,
      error,
      reload,
      bookBySlug: (slug) => catalog.books.find((b) => b.slug === slug),
      bookById: (id) => books.get(id),
      authorById: (id) => authors.get(id),
      authorBySlug: (slug) => catalog.authors.find((a) => a.slug === slug),
      categoryById: (id) => (id ? categories.get(id) : undefined),
      preorderFor: (bookId) => preorders.get(bookId),
      filesFor: (bookId, kind) =>
        catalog.digitalFiles.filter((f) => f.bookId === bookId && (!kind || f.kind === kind)).sort((a, b) => a.position - b.position),
    };
  }, [catalog, loading, error, reload]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog fora de CatalogProvider');
  return ctx;
}
