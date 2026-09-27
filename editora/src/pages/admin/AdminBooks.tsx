import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { DataTable } from '../../components/admin/DataTable';
import { PreorderForm } from '../../components/admin/PreorderForm';
import { PreorderBadge } from '../../components/book/Badges';
import { BookCover } from '../../components/book/BookCover';
import { AdminPageHeader } from '../../components/layout/AdminLayout';
import { ButtonLink } from '../../components/ui/Button';
import { Notice, Spinner } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { useCatalog } from '../../context/CatalogContext';
import { api } from '../../data';
import { bookToInput } from '../../components/admin/bookInput';
import { formatMoney } from '../../lib/format';
import { getPreorderState } from '../../lib/preorder';
import { useAsync } from '../../lib/useAsync';
import type { Book } from '../../types';

export default function AdminBooks() {
  const { data, loading, error, reload } = useAsync(() => api.admin.getCatalog(), []);
  const { reload: reloadPublic } = useCatalog();
  const [q, setQ] = useState('');
  const [actionError, setActionError] = useState('');
  const [preorderBook, setPreorderBook] = useState<Book | null>(null);

  const books = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data?.books ?? []).filter((b) => !term || b.title.toLowerCase().includes(term));
  }, [data, q]);

  async function act(fn: () => Promise<unknown>) {
    setActionError('');
    try {
      await fn();
      reload();
      void reloadPublic();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ocorreu um erro.');
    }
  }

  if (loading && !data) return <Spinner />;
  if (error || !data) return <Notice tone="error">{error}</Notice>;
  const authorName = (id: string) => data.authors.find((a) => a.id === id)?.name ?? '—';
  const preorderOf = (id: string) => data.preorders.find((p) => p.bookId === id);

  return (
    <>
      <AdminPageHeader
        title="Livros"
        description={`${data.books.length} livros · ${data.books.filter((b) => b.published).length} publicados`}
        actions={<ButtonLink to="/admin/livros/novo"><Plus size={16} aria-hidden="true" /> Novo livro</ButtonLink>}
      />
      <label htmlFor="pesquisa-livros" className="sr-only">Pesquisar livros</label>
      <input id="pesquisa-livros" type="search" className="input mb-4 max-w-sm" placeholder="Pesquisar por título…" value={q} onChange={(e) => setQ(e.target.value)} />
      {actionError && <Notice tone="error" className="mb-4">{actionError}</Notice>}
      <DataTable caption="Livros" head={['Livro', 'Preço', 'Stock', 'Estado', 'Pré-venda', <span key="acoes" className="sr-only">Ações</span>]}>
        {books.map((b) => {
          const pre = preorderOf(b.id);
          return (
            <tr key={b.id} className="align-middle">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 shrink-0"><BookCover book={b} size="xs" /></div>
                  <div className="min-w-0">
                    <Link to={`/admin/livros/${b.id}`} className="font-medium hover:underline">{b.title}</Link>
                    <p className="text-xs text-muted">{authorName(b.authorId)}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 tabular-nums">{formatMoney(b.price)}</td>
              <td className="px-4 py-3 tabular-nums">{b.stock}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.published ? 'bg-success-soft text-success' : 'bg-surface-alt text-muted'}`}>
                  {b.published ? 'Publicado' : 'Rascunho'}
                </span>
              </td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => setPreorderBook(b)} className="-my-2 min-h-10 text-left hover:underline">
                  {pre ? <PreorderBadge state={getPreorderState(pre)} /> : <span className="text-xs text-muted">Ativar…</span>}
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <button type="button" className="flex h-10 w-10 items-center justify-center rounded hover:bg-surface-alt" title={b.published ? 'Despublicar' : 'Publicar'} aria-label={`${b.published ? 'Despublicar' : 'Publicar'} «${b.title}»`} onClick={() => act(() => api.admin.saveBook({ ...bookToInput(b), published: !b.published }))}>
                    {b.published ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <Link to={`/admin/livros/${b.id}`} className="flex h-10 w-10 items-center justify-center rounded hover:bg-surface-alt" aria-label={`Editar «${b.title}»`}>
                    <Pencil size={16} />
                  </Link>
                  <button type="button" className="flex h-10 w-10 items-center justify-center rounded text-danger hover:bg-danger-soft" aria-label={`Eliminar «${b.title}»`} onClick={() => confirm(`Eliminar «${b.title}» definitivamente?`) && act(() => api.admin.deleteBook(b.id))}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </DataTable>

      <Modal open={Boolean(preorderBook)} onClose={() => setPreorderBook(null)} title={preorderBook ? `Pré-venda · ${preorderBook.title}` : ''}>
        {preorderBook && (
          <PreorderForm
            books={data.books}
            bookId={preorderBook.id}
            preorder={preorderOf(preorderBook.id)}
            onSaved={() => {
              setPreorderBook(null);
              reload();
              void reloadPublic();
            }}
          />
        )}
      </Modal>
    </>
  );
}
