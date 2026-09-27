import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { OrderStatusBadge } from '../../components/OrderStatus';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, Notice, Spinner } from '../../components/ui/Feedback';
import { TextField } from '../../components/ui/Form';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { api } from '../../data';
import { cn } from '../../lib/cn';
import { formatDate, formatMoney } from '../../lib/format';
import { useSeo } from '../../lib/seo';
import { useAsync } from '../../lib/useAsync';
import { customerSchema, fieldErrors } from '../../lib/validation';
import type { Order } from '../../types';

const tabs = [
  { id: 'encomendas', label: 'Encomendas' },
  { id: 'pre-vendas', label: 'Pré-vendas' },
  { id: 'dados', label: 'Dados pessoais' },
] as const;

type Tab = (typeof tabs)[number]['id'];

export default function Account() {
  const { profile, signOut } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.id === params.get('separador'))?.id ?? 'encomendas') as Tab;
  const { data: orders, loading, error } = useAsync(() => api.listMyOrders(), []);
  useSeo({ title: 'A minha conta', noindex: true });

  if (!profile) return null;

  return (
    <div className="page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">A minha conta</p>
          <h1 className="t-h1 mt-2">Olá, {profile.fullName.split(' ')[0] || 'leitor'}.</h1>
        </div>
        <div className="flex gap-2">
          {profile.role === 'admin' && <ButtonLink to="/admin" variant="secondary" size="sm">Painel da editora</ButtonLink>}
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>Sair</Button>
        </div>
      </div>

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams({ separador: t.id }, { replace: true })}
            className={cn('-mb-px shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition', tab === t.id ? 'border-secondary text-fg' : 'border-transparent text-muted hover:text-fg')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8" role="tabpanel">
        {tab === 'dados' ? (
          <ProfileForm />
        ) : loading ? (
          <Spinner />
        ) : error ? (
          <Notice tone="error">{error}</Notice>
        ) : (
          <OrdersList orders={tab === 'pre-vendas' ? (orders ?? []).filter((o) => o.items.some((i) => i.isPreorder)) : (orders ?? [])} preorders={tab === 'pre-vendas'} />
        )}
      </div>
    </div>
  );
}

function OrdersList({ orders, preorders }: { orders: Order[]; preorders: boolean }) {
  const { preorderFor } = useCatalog();
  if (orders.length === 0) {
    return (
      <EmptyState
        title={preorders ? 'Ainda não reservou nenhum livro' : 'Ainda não fez encomendas'}
        action={<ButtonLink to={preorders ? '/pre-venda' : '/livros'}>{preorders ? 'Ver pré-vendas' : 'Explorar o catálogo'}</ButtonLink>}
      />
    );
  }
  return (
    <ul className="divide-y divide-line rounded-card border border-line bg-surface">
      {orders.map((o) => {
        const items = preorders ? o.items.filter((i) => i.isPreorder) : o.items;
        return (
          <li key={o.id}>
            <Link to={`/encomenda/${o.id}`} className="grid gap-2 px-5 py-4 transition hover:bg-background sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
              <div className="min-w-0">
                <p className="font-medium text-fg">{o.number}</p>
                <p className="truncate text-sm text-muted">
                  {formatDate(o.createdAt)} · {items.map((i) => `${i.quantity}× ${i.title}`).join(', ')}
                </p>
                {preorders &&
                  items.map((i) => {
                    const date = preorderFor(i.bookId)?.expectedShipDate;
                    return date ? (
                      <p key={i.id} className="text-sm text-muted">
                        «{i.title}» — envio previsto {formatDate(date)}
                      </p>
                    ) : null;
                  })}
              </div>
              <OrderStatusBadge status={o.status} />
              <p className="font-semibold">{formatMoney(o.total)}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const profileSchema = customerSchema.pick({ fullName: true, phone: true });

function ProfileForm() {
  const { profile, refresh } = useAuth();
  const [values, setValues] = useState({ fullName: profile?.fullName ?? '', phone: profile?.phone ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error as z.ZodError));
      return;
    }
    setErrors({});
    setStatus('saving');
    try {
      await api.updateProfile(parsed.data);
      await refresh();
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Não foi possível guardar.');
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-lg space-y-4">
      <TextField label="E-mail" value={profile?.email ?? ''} disabled hint="Para alterar o e-mail, contacte-nos." />
      <TextField label="Nome completo" autoComplete="name" value={values.fullName} onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))} error={errors.fullName} required />
      <TextField label="Telefone" type="tel" autoComplete="tel" value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} error={errors.phone} required />
      {status === 'saved' && <Notice tone="success">Dados atualizados.</Notice>}
      {status === 'error' && <Notice tone="error">{message}</Notice>}
      <Button type="submit" loading={status === 'saving'}>Guardar alterações</Button>
    </form>
  );
}
