import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { api, type PreorderInput } from '../../data';
import { fieldErrors } from '../../lib/validation';
import type { Book, Preorder } from '../../types';
import { Button } from '../ui/Button';
import { Notice } from '../ui/Feedback';
import { Checkbox, SelectField, TextAreaField, TextField } from '../ui/Form';

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const schema = z
  .object({
    bookId: z.string().min(1, 'Escolha o livro.'),
    startsAt: z.string().min(1, 'Indique o início.'),
    endsAt: z.string().min(1, 'Indique o fim.'),
    unitLimit: z.string().regex(/^\d*$/, 'Use um número inteiro.'),
    specialPrice: z.string().regex(/^\d+$/, 'Indique o preço especial (inteiro, em Kz).'),
    expectedShipDate: z.string(),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), { message: 'O fim tem de ser depois do início.', path: ['endsAt'] });

/** Criar/editar pré-venda: início, fim, limite de unidades, preço especial. */
export function PreorderForm({ books, preorder, bookId, onSaved }: { books: Book[]; preorder?: Preorder; bookId?: string; onSaved: () => void }) {
  const [v, setV] = useState(() => {
    const now = Date.now();
    return {
    bookId: preorder?.bookId ?? bookId ?? '',
    enabled: preorder?.enabled ?? true,
    startsAt: toLocalInput(preorder?.startsAt ?? new Date(now).toISOString()),
    endsAt: toLocalInput(preorder?.endsAt ?? new Date(now + 30 * 86_400_000).toISOString()),
    unitLimit: preorder?.unitLimit?.toString() ?? '',
    specialPrice: preorder?.specialPrice?.toString() ?? books.find((b) => b.id === (preorder?.bookId ?? bookId))?.price.toString() ?? '',
    expectedShipDate: preorder?.expectedShipDate ?? '',
    benefits: (preorder?.benefits ?? []).join('\n'),
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(v);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    if (preorder && v.unitLimit && Number(v.unitLimit) < preorder.reserved) {
      return setErrors({ unitLimit: `Já existem ${preorder.reserved} reservas; o limite não pode ser inferior.` });
    }
    setErrors({});
    setSaving(true);
    setError('');
    const input: PreorderInput = {
      id: preorder?.id,
      bookId: v.bookId,
      enabled: v.enabled,
      startsAt: new Date(v.startsAt).toISOString(),
      endsAt: new Date(v.endsAt).toISOString(),
      unitLimit: v.unitLimit ? Number(v.unitLimit) : null,
      specialPrice: Number(v.specialPrice),
      expectedShipDate: v.expectedShipDate || null,
      benefits: v.benefits.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    try {
      await api.admin.savePreorder(input);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <SelectField label="Livro" value={v.bookId} onChange={set('bookId')} error={errors.bookId} disabled={Boolean(preorder || bookId)} required>
        <option value="">Escolher…</option>
        {books.map((b) => (
          <option key={b.id} value={b.id}>
            {b.title}
          </option>
        ))}
      </SelectField>
      <Checkbox label="Pré-venda ativa (desmarque para fechar)" checked={v.enabled} onChange={set('enabled')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Início" type="datetime-local" value={v.startsAt} onChange={set('startsAt')} error={errors.startsAt} required />
        <TextField label="Fim" type="datetime-local" value={v.endsAt} onChange={set('endsAt')} error={errors.endsAt} required />
        <TextField label="Preço especial (Kz)" inputMode="numeric" value={v.specialPrice} onChange={set('specialPrice')} error={errors.specialPrice} required />
        <TextField label="Limite de unidades" inputMode="numeric" value={v.unitLimit} onChange={set('unitLimit')} error={errors.unitLimit} hint="Vazio = sem limite." />
        <TextField label="Envio previsto" type="date" value={v.expectedShipDate} onChange={set('expectedShipDate')} />
        {preorder && (
          <div className="rounded-md bg-background px-4 py-3 text-sm">
            <p className="text-muted">Reservas</p>
            <p className="font-display text-2xl">{preorder.reserved}</p>
          </div>
        )}
      </div>
      <TextAreaField label="Benefícios" value={v.benefits} onChange={set('benefits')} hint="Um por linha. Vazio = benefícios padrão da configuração." />
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" loading={saving}>Guardar pré-venda</Button>
    </form>
  );
}
