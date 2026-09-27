import { useMemo, useState } from 'react';
import { DataTable } from '../../components/admin/DataTable';
import { AdminPageHeader } from '../../components/layout/AdminLayout';
import { Notice, Spinner } from '../../components/ui/Feedback';
import { api } from '../../data';
import { formatMoney, formatShortDate } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';

export default function AdminCustomers() {
  const { data, loading, error } = useAsync(() => api.admin.listCustomers(), []);
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((c) => !term || c.fullName.toLowerCase().includes(term) || c.email.includes(term));
  }, [data, q]);

  if (loading) return <Spinner />;
  if (error || !data) return <Notice tone="error">{error}</Notice>;

  return (
    <>
      <AdminPageHeader title="Clientes" description={`${data.filter((c) => c.role === 'customer').length} clientes registados`} />
      <label htmlFor="pesquisa-clientes" className="sr-only">Pesquisar clientes</label>
      <input id="pesquisa-clientes" type="search" className="input mb-4 max-w-sm" placeholder="Nome ou e-mail…" value={q} onChange={(e) => setQ(e.target.value)} />
      <DataTable caption="Clientes" head={['Nome', 'Contacto', 'Registo', 'Encomendas', 'Total pago']}>
        {rows.map((c) => (
          <tr key={c.id}>
            <td className="px-4 py-3 font-medium">
              {c.fullName || '—'}
              {c.role === 'admin' && <span className="ml-2 rounded bg-surface-alt px-1.5 py-0.5 text-[11px] font-semibold uppercase text-muted">Equipa</span>}
            </td>
            <td className="px-4 py-3">
              {c.email}
              <p className="text-xs text-muted">{c.phone}</p>
            </td>
            <td className="px-4 py-3 text-muted">{formatShortDate(c.createdAt)}</td>
            <td className="px-4 py-3 tabular-nums">{c.orders}</td>
            <td className="px-4 py-3 tabular-nums">{formatMoney(c.spent)}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
