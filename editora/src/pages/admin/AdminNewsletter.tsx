import { Download } from 'lucide-react';
import { DataTable } from '../../components/admin/DataTable';
import { AdminPageHeader } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { EmptyState, Notice, Spinner } from '../../components/ui/Feedback';
import { api } from '../../data';
import { formatShortDate } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';

export default function AdminNewsletter() {
  const { data, loading, error } = useAsync(() => api.admin.listSubscribers(), []);
  if (loading) return <Spinner />;
  if (error || !data) return <Notice tone="error">{error}</Notice>;

  function exportCsv() {
    const csv = ['email,data_subscricao', ...data!.map((s) => `${s.email},${s.createdAt}`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newsletter.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <AdminPageHeader
        title="Newsletter"
        description={`${data.length} subscritores`}
        actions={data.length > 0 && <Button variant="secondary" onClick={exportCsv}><Download size={16} aria-hidden="true" /> Exportar CSV</Button>}
      />
      {data.length === 0 ? (
        <EmptyState title="Ainda sem subscritores" />
      ) : (
        <DataTable caption="Subscritores" head={['E-mail', 'Subscrição']}>
          {data.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3">{s.email}</td>
              <td className="px-4 py-3 text-ink-600">{formatShortDate(s.createdAt)}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
