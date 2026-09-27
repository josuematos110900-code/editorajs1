import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpen, CalendarClock, CheckCircle2, Coins, Package, PenLine, Users } from 'lucide-react';
import { DataTable } from '../../components/admin/DataTable';
import { StatCard } from '../../components/admin/StatCard';
import { AdminPageHeader } from '../../components/layout/AdminLayout';
import { OrderStatusBadge } from '../../components/OrderStatus';
import { Notice, Spinner } from '../../components/ui/Feedback';
import { api } from '../../data';
import { computeAlerts, computeDashboard } from '../../lib/dashboard';
import { formatMoney, formatShortDate } from '../../lib/format';
import { getPreorderState } from '../../lib/preorder';
import { useAsync } from '../../lib/useAsync';

export default function AdminDashboard() {
  const { data, loading, error } = useAsync(async () => {
    const [catalog, orders, customers] = await Promise.all([api.admin.getCatalog(), api.admin.listOrders(), api.admin.listCustomers()]);
    return { catalog, orders, customers };
  }, []);

  if (loading) return <Spinner />;
  if (error || !data) return <Notice tone="error">{error}</Notice>;

  const { catalog, orders, customers } = data;
  const stats = computeDashboard(orders, catalog.preorders, catalog.books);
  const openPreorders = catalog.preorders.filter((p) => getPreorderState(p) === 'aberta').length;
  const maxDay = Math.max(1, ...stats.revenueByDay.map((d) => d.revenue));
  const alerts = computeAlerts(orders, catalog.preorders, catalog.books);
  const availableBooks = catalog.books.filter((b) => b.published && b.stock > 0).length;

  return (
    <>
      <AdminPageHeader title="Painel" description="Visão geral das vendas, pré-vendas e encomendas." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard className="col-span-2" label="Receita" value={formatMoney(stats.revenue)} hint={`${stats.paidOrders} encomendas pagas`} icon={<Coins size={18} />} />
        <StatCard label="Vendas" value={stats.unitsSold} hint="exemplares pagos" icon={<Package size={18} />} />
        <StatCard label="Pré-vendas" value={stats.preorderUnits} hint={`${openPreorders} campanha(s) aberta(s)`} icon={<CalendarClock size={18} />} />
        <StatCard label="Encomendas" value={stats.totalOrders} hint={`${stats.toShip} por enviar`} icon={<Package size={18} />} />
        <StatCard label="Livros" value={catalog.books.length} hint={`${availableBooks} disponíveis em stock`} icon={<BookOpen size={18} />} />
        <StatCard label="Autores" value={catalog.authors.length} icon={<PenLine size={18} />} />
        <StatCard label="Clientes" value={customers.filter((c) => c.role === 'customer').length} hint="contas registadas" icon={<Users size={18} />} />
      </div>

      <section className="mt-8" aria-labelledby="alertas">
        <h2 id="alertas" className="t-h4 mb-3">Alertas</h2>
        {alerts.length === 0 ? (
          <p className="flex items-center gap-2 rounded-card border border-line bg-surface p-4 t-small text-success">
            <CheckCircle2 size={16} aria-hidden="true" /> Tudo em ordem — nada pede atenção hoje.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-card border border-line bg-surface">
            {alerts.map((a) => (
              <li key={a.id}>
                <Link to={a.to} className="group flex items-center gap-3 px-4 py-3 t-small transition-colors hover:bg-background">
                  <AlertTriangle size={16} className={a.tone === 'error' ? 'shrink-0 text-danger' : 'shrink-0 text-warning'} aria-hidden="true" />
                  <span className="sr-only">{a.tone === 'error' ? 'Urgente:' : 'Atenção:'}</span>
                  <span className="flex-1 text-fg">{a.message}</span>
                  <ArrowRight size={15} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-card border border-line bg-surface p-5" aria-labelledby="receita-30">
        <h2 id="receita-30" className="t-h4">Receita dos últimos 30 dias</h2>
        <div className="mt-4 flex h-32 items-end gap-[3px]" aria-hidden="true">
          {stats.revenueByDay.map((d) => (
            <div key={d.date} className="flex-1 rounded-t-sm bg-primary/80" style={{ height: `${Math.max(2, (d.revenue / maxDay) * 100)}%`, opacity: d.revenue ? 1 : 0.15 }} title={`${formatShortDate(d.date)}: ${formatMoney(d.revenue)}`} />
          ))}
        </div>
        <p className="sr-only">
          Receita total nos últimos 30 dias: {formatMoney(stats.revenueByDay.reduce((s, d) => s + d.revenue, 0))}.
        </p>
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="mais-vendidos">
          <h2 id="mais-vendidos" className="t-h4 mb-3">Livros mais vendidos</h2>
          {stats.topBooks.length === 0 ? (
            <p className="rounded-card border border-dashed border-line p-6 text-sm text-muted">Ainda sem vendas pagas.</p>
          ) : (
            <DataTable caption="Livros mais vendidos" head={['Livro', 'Exemplares', 'Receita']}>
              {stats.topBooks.map((b) => (
                <tr key={b.bookId}>
                  <td className="px-4 py-3 font-medium">{b.title}</td>
                  <td className="px-4 py-3 tabular-nums">{b.units}</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(b.revenue)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </section>
        <section aria-labelledby="recentes">
          <h2 id="recentes" className="t-h4 mb-3">Encomendas recentes</h2>
          {orders.length === 0 ? (
            <p className="rounded-card border border-dashed border-line p-6 text-sm text-muted">Ainda sem encomendas.</p>
          ) : (
            <DataTable caption="Encomendas recentes" head={['Número', 'Cliente', 'Estado', 'Total']}>
              {orders.slice(0, 6).map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3"><Link to={`/admin/encomendas?id=${o.id}`} className="font-medium underline-offset-2 hover:underline">{o.number}</Link></td>
                  <td className="px-4 py-3">{o.customerName}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(o.total)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </section>
      </div>
    </>
  );
}
