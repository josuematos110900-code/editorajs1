import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { bookToInput } from '../../components/admin/bookInput';
import { ImageUpload } from '../../components/admin/ImageUpload';
import { AuthorPortrait } from '../../components/book/AuthorCard';
import { AdminPageHeader } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Notice, Spinner } from '../../components/ui/Feedback';
import { Checkbox, TextAreaField, TextField } from '../../components/ui/Form';
import { Modal } from '../../components/ui/Modal';
import { useCatalog } from '../../context/CatalogContext';
import { api, type Catalog } from '../../data';
import { slugify } from '../../lib/slug';
import { useAsync } from '../../lib/useAsync';
import { fieldErrors } from '../../lib/validation';
import type { Author } from '../../types';

export default function AdminAuthors() {
  const { data, loading, error, reload } = useAsync(() => api.admin.getCatalog(), []);
  const { reload: reloadPublic } = useCatalog();
  const [editing, setEditing] = useState<Author | 'novo' | null>(null);
  const [actionError, setActionError] = useState('');

  if (loading && !data) return <Spinner />;
  if (error || !data) return <Notice tone="error">{error}</Notice>;

  return (
    <>
      <AdminPageHeader title="Autores" description={`${data.authors.length} autores`} actions={<Button onClick={() => setEditing('novo')}><Plus size={16} aria-hidden="true" /> Novo autor</Button>} />
      {actionError && <Notice tone="error" className="mb-4">{actionError}</Notice>}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.authors.map((a) => {
          const count = data.books.filter((b) => b.authorId === a.id).length;
          return (
            <li key={a.id} className="flex gap-4 rounded-card border border-line bg-surface p-4">
              <AuthorPortrait author={a} className="w-16 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-sm text-muted">{count} {count === 1 ? 'livro' : 'livros'}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{a.bio}</p>
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" className="flex h-10 w-10 items-center justify-center rounded hover:bg-surface-alt" aria-label={`Editar ${a.name}`} onClick={() => setEditing(a)}><Pencil size={16} /></button>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded text-danger hover:bg-danger-soft"
                  aria-label={`Eliminar ${a.name}`}
                  onClick={async () => {
                    if (!confirm(`Eliminar ${a.name}?`)) return;
                    setActionError('');
                    try {
                      await api.admin.deleteAuthor(a.id);
                      reload();
                      void reloadPublic();
                    } catch (err) {
                      setActionError(err instanceof Error ? err.message : 'Ocorreu um erro.');
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'novo' ? 'Novo autor' : 'Editar autor'} wide>
        {editing && (
          <AuthorForm
            catalog={data}
            author={editing === 'novo' ? undefined : editing}
            onSaved={() => {
              setEditing(null);
              reload();
              void reloadPublic();
            }}
          />
        )}
      </Modal>
    </>
  );
}

const schema = z.object({
  name: z.string().trim().min(2, 'Indique o nome.'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Só minúsculas, números e hífens.'),
  bio: z.string().trim().min(10, 'Escreva uma biografia (mín. 10 caracteres).'),
});

function AuthorForm({ catalog, author, onSaved }: { catalog: Catalog; author?: Author; onSaved: () => void }) {
  const [v, setV] = useState({ name: author?.name ?? '', slug: author?.slug ?? '', bio: author?.bio ?? '', photoUrl: author?.photoUrl ?? null });
  const [slugTouched, setSlugTouched] = useState(Boolean(author));
  const [linked, setLinked] = useState<Set<string>>(new Set(catalog.books.filter((b) => author && b.authorId === author.id).map((b) => b.id)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(v);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setSaving(true);
    setError('');
    try {
      const saved = await api.admin.saveAuthor({ id: author?.id, ...parsed.data, photoUrl: v.photoUrl });
      // Associar livros: os marcados passam a ser deste autor.
      const toLink = catalog.books.filter((b) => linked.has(b.id) && b.authorId !== saved.id);
      for (const b of toLink) await api.admin.saveBook({ ...bookToInput(b), authorId: saved.id });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 sm:grid-cols-[9rem_1fr]">
      <div className="space-y-3">
        <AuthorPortrait author={{ name: v.name || '?', photoUrl: v.photoUrl }} />
        <ImageUpload label="Fotografia" folder="authors" onUploaded={(url) => setV((s) => ({ ...s, photoUrl: url }))} />
        {v.photoUrl && <Button variant="ghost" size="sm" onClick={() => setV((s) => ({ ...s, photoUrl: null }))}>Remover</Button>}
      </div>
      <div className="space-y-4">
        <TextField
          label="Nome"
          value={v.name}
          onChange={(e) => setV((s) => ({ ...s, name: e.target.value, slug: slugTouched ? s.slug : slugify(e.target.value) }))}
          error={errors.name}
          required
        />
        <TextField label="URL amigável (slug)" value={v.slug} onChange={(e) => { setSlugTouched(true); setV((s) => ({ ...s, slug: slugify(e.target.value) })); }} error={errors.slug} hint={`/autores/${v.slug || '…'}`} required />
        <TextAreaField label="Biografia" value={v.bio} onChange={(e) => setV((s) => ({ ...s, bio: e.target.value }))} error={errors.bio} required />
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg">Livros associados</legend>
          <div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border border-line p-3 sm:grid-cols-2">
            {catalog.books.map((b) => {
              const own = author && b.authorId === author.id;
              return (
                <Checkbox
                  key={b.id}
                  label={b.title}
                  checked={linked.has(b.id)}
                  disabled={Boolean(own)}
                  onChange={(e) =>
                    setLinked((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(b.id);
                      else next.delete(b.id);
                      return next;
                    })
                  }
                />
              );
            })}
          </div>
          <p className="mt-1 text-xs text-muted">Marcar um livro reatribui-o a este autor. Para remover, escolha outro autor no livro.</p>
        </fieldset>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" loading={saving}>Guardar autor</Button>
      </div>
    </form>
  );
}
