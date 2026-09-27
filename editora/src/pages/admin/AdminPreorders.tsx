import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { DataTable } from '../../components/admin/DataTable';
import { PreorderForm } from '../../components/admin/PreorderForm';
import { PreorderBadge } from '../../components/book/Badges';
import { AdminPageHeader } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { EmptyState, Notice, Spinner } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { useCatalog } from '../../context/CatalogContext';
import { api } from '../../data';
import { formatMoney, formatShortDate } from '../../lib/format';
import { getPreorderState } from '../../lib/preorder';
import { useAsync } from '../../lib/useAsync';
import type { Preorder } from '../../types';

export default function AdminPreorders() {
  const { data, loading, error, reload } = useAsync(() => api.admin.getCatalog(), []);
  const { reload: reloadPublic } = useCatalog();
  const [editing, setEditing] = useState<Preorder | 'nova' | null>(null);
  const [actionError, setActionError] = useState('');

  if (loading && !data) return <Spinner />;
  if (error || !data) return <Notice tone="error">{error}</Notice>;

  const title = (bookId: string) => data.books.find((b) => b.id === bookId)?.title ?? '—';
  const totalReserved = data.preorders.reduce((s, p) => s + p.reserved, 0);
  const booksWithout = data.books.filter((b) => !data.preorders.some((p) => p.bookId === b.id));

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

  const done = () => {
    setEditing(null);
    reload();
    void reloadPublic();
  };

  return (
    <>
      <AdminPageHeader
        title="Pré-vendas"
        description={`${totalReserved} exemplares reservados no total`}
        actions={<Button onClick={() => setEditing('nova')} disabled={booksWithout.length === 0}><Plus size={16} aria-hidden="true" /> Nova pré-venda</Button>}
      />
      {actionError && <Notice tone="error" className="mb-4">{actionError}</Notice>}
      {data.preorders.length === 0 ? (
        <EmptyState title="Sem pré-vendas">Crie uma pré-venda para um livro por lançar.</EmptyState>
      ) : (
        <DataTable caption="Pré-vendas" head={['Livro', 'Estado', 'Janela', 'Preço especial', 'Reservas', <span key="acoes" className="sr-only">Ações</span>]}>
          {data.preorders.map((p) => {
            const state = getPreorderState(p);
            return (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium">{title(p.bookId)}</td>
                <td className="px-4 py-3"><PreorderBadge state={state} /></td>
                <td className="px-4 py-3 text-muted">{formatShortDate(p.startsAt)} → {formatShortDate(p.endsAt)}</td>
                <td className="px-4 py-3 tabular-nums">{formatMoney(p.specialPrice)}</td>
                <td className="px-4 py-3 tabular-nums">
                  {p.reserved}
                  {p.unitLimit !== null && <span className="text-muted"> / {p.unitLimit}</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => act(() => api.admin.savePreorder({ ...p, enabled: !p.enabled }))}>
                      {p.enabled ? 'Fechar' : 'Abrir'}
                    </Button>
                    <button type="button" className="flex h-10 w-10 items-center justify-center rounded hover:bg-surface-alt" aria-label={`Editar pré-venda de «${title(p.bookId)}»`} onClick={() => setEditing(p)}>
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="flex h-10 w-10 items-center justify-center rounded text-danger hover:bg-danger-soft" aria-label={`Eliminar pré-venda de «${title(p.bookId)}»`} onClick={() => confirm('Eliminar esta pré-venda?') && act(() => api.admin.deletePreorder(p.id))}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'nova' ? 'Nova pré-venda' : 'Editar pré-venda'}>
        {editing === 'nova' && <PreorderForm books={booksWithout} onSaved={done} />}
        {editing && editing !== 'nova' && <PreorderForm books={data.books} preorder={editing} onSaved={done} />}
      </Modal>
    </>
  );
}
