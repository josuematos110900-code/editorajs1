import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { z } from 'zod';
import { bookToInput } from '../../components/admin/bookInput';
import { ImageUpload } from '../../components/admin/ImageUpload';
import { BookCover } from '../../components/book/BookCover';
import { AdminPageHeader } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Notice, Spinner } from '../../components/ui/Feedback';
import { Checkbox, SelectField, TextAreaField, TextField } from '../../components/ui/Form';
import { site } from '../../config/site';
import { useCatalog } from '../../context/CatalogContext';
import { api, type BookInput } from '../../data';
import { formatLabels } from '../../lib/format';
import { slugify } from '../../lib/slug';
import { useAsync } from '../../lib/useAsync';
import { fieldErrors } from '../../lib/validation';
import type { BookFormat } from '../../types';

const intString = (msg: string) => z.string().regex(/^\d+$/, msg);

const schema = z.object({
  title: z.string().trim().min(1, 'Indique o título.'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Só minúsculas, números e hífens.'),
  authorId: z.string().min(1, 'Escolha o autor.'),
  synopsis: z.string().trim().min(10, 'Escreva uma sinopse (mín. 10 caracteres).'),
  price: intString('Indique o preço (inteiro, em Kz).'),
  stock: intString('Indique o stock (inteiro).'),
  pages: z.string().regex(/^\d*$/, 'Número inteiro.'),
  compareAtPrice: z.string().regex(/^\d*$/, 'Número inteiro.'),
  formats: z.array(z.string()).min(1, 'Escolha pelo menos um formato.'),
});

const empty: BookInput = {
  slug: '',
  title: '',
  subtitle: null,
  authorId: '',
  categoryId: null,
  synopsis: '',
  description: '',
  pages: null,
  isbn: null,
  publisher: site.name,
  publicationDate: null,
  formats: ['capa_mole'],
  price: 0,
  compareAtPrice: null,
  stock: 0,
  coverUrl: null,
  gallery: [],
  coverColor: '#2A2723',
  published: false,
};

export default function AdminBookForm() {
  const { id } = useParams();
  const isNew = !id || id === 'novo';
  const navigate = useNavigate();
  const { reload: reloadPublic } = useCatalog();
  const { data, loading, error } = useAsync(() => api.admin.getCatalog(), []);
  const [book, setBook] = useState<BookInput>(empty);
  const [nums, setNums] = useState({ price: '', stock: '0', pages: '', compareAtPrice: '' });
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data || isNew) return;
    const existing = data.books.find((b) => b.id === id);
    if (existing) {
      setBook(bookToInput(existing));
      setNums({
        price: String(existing.price),
        stock: String(existing.stock),
        pages: existing.pages?.toString() ?? '',
        compareAtPrice: existing.compareAtPrice?.toString() ?? '',
      });
    }
  }, [data, id, isNew]);

  if (loading) return <Spinner />;
  if (error || !data) return <Notice tone="error">{error}</Notice>;
  if (!isNew && !data.books.some((b) => b.id === id)) return <Notice tone="error">Livro não encontrado.</Notice>;

  const set = <K extends keyof BookInput>(key: K, value: BookInput[K]) => setBook((b) => ({ ...b, [key]: value }));
  const author = data.authors.find((a) => a.id === book.authorId);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ ...book, ...nums });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});
    setSaving(true);
    setSaveError('');
    try {
      const saved = await api.admin.saveBook({
        ...book,
        id: isNew ? undefined : id,
        title: book.title.trim(),
        price: Number(nums.price),
        stock: Number(nums.stock),
        pages: nums.pages ? Number(nums.pages) : null,
        compareAtPrice: nums.compareAtPrice ? Number(nums.compareAtPrice) : null,
        isbn: book.isbn?.trim() || null,
        subtitle: book.subtitle?.trim() || null,
      });
      void reloadPublic();
      navigate(isNew ? `/admin/livros/${saved.id}` : '/admin/livros', { replace: isNew });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Não foi possível guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link to="/admin/livros" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-950">
        <ArrowLeft size={15} aria-hidden="true" /> Livros
      </Link>
      <AdminPageHeader title={isNew ? 'Novo livro' : book.title || 'Editar livro'} />
      <form onSubmit={onSubmit} noValidate className="grid gap-8 xl:grid-cols-[1fr_18rem]">
        <div className="space-y-8">
          <fieldset className="space-y-4 rounded-lg border border-ink-100 bg-white p-6">
            <legend className="px-1 font-display text-lg">Informação</legend>
            <TextField
              label="Título"
              value={book.title}
              onChange={(e) => {
                set('title', e.target.value);
                if (!slugTouched) set('slug', slugify(e.target.value));
              }}
              error={errors.title}
              required
            />
            <TextField label="Subtítulo" value={book.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} />
            <TextField
              label="URL amigável (slug)"
              value={book.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set('slug', slugify(e.target.value));
              }}
              error={errors.slug}
              hint={`/livros/${book.slug || '…'}`}
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Autor" value={book.authorId} onChange={(e) => set('authorId', e.target.value)} error={errors.authorId} required>
                <option value="">Escolher…</option>
                {data.authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </SelectField>
              <SelectField label="Género" value={book.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || null)}>
                <option value="">Sem género</option>
                {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectField>
            </div>
            <TextAreaField label="Sinopse" value={book.synopsis} onChange={(e) => set('synopsis', e.target.value)} error={errors.synopsis} hint="Usada também como descrição para motores de busca (primeiros 160 caracteres)." required />
            <TextAreaField label="Descrição" value={book.description} onChange={(e) => set('description', e.target.value)} />
          </fieldset>

          <fieldset className="space-y-4 rounded-lg border border-ink-100 bg-white p-6">
            <legend className="px-1 font-display text-lg">Ficha técnica</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="ISBN" value={book.isbn ?? ''} onChange={(e) => set('isbn', e.target.value)} />
              <TextField label="Número de páginas" inputMode="numeric" value={nums.pages} onChange={(e) => setNums((n) => ({ ...n, pages: e.target.value }))} error={errors.pages} />
              <TextField label="Editora" value={book.publisher} onChange={(e) => set('publisher', e.target.value)} />
              <TextField label="Data de publicação / lançamento" type="date" value={book.publicationDate ?? ''} onChange={(e) => set('publicationDate', e.target.value || null)} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink-800">Formatos</p>
              <div className="flex flex-wrap gap-5">
                {(Object.keys(formatLabels) as BookFormat[]).map((f) => (
                  <Checkbox
                    key={f}
                    label={formatLabels[f]}
                    checked={book.formats.includes(f)}
                    onChange={(e) => set('formats', e.target.checked ? [...book.formats, f] : book.formats.filter((x) => x !== f))}
                  />
                ))}
              </div>
              {errors.formats && <p className="mt-1 text-sm text-seal-700" role="alert">{errors.formats}</p>}
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-lg border border-ink-100 bg-white p-6">
            <legend className="px-1 font-display text-lg">Preço e stock</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Preço (Kz)" inputMode="numeric" value={nums.price} onChange={(e) => setNums((n) => ({ ...n, price: e.target.value }))} error={errors.price} required />
              <TextField label="Preço anterior (Kz)" inputMode="numeric" value={nums.compareAtPrice} onChange={(e) => setNums((n) => ({ ...n, compareAtPrice: e.target.value }))} error={errors.compareAtPrice} hint="Aparece riscado." />
              <TextField label="Stock" inputMode="numeric" value={nums.stock} onChange={(e) => setNums((n) => ({ ...n, stock: e.target.value }))} error={errors.stock} required />
            </div>
            <p className="text-xs text-ink-500">Preço especial, datas e limite de pré-venda geridos em «Pré-vendas».</p>
          </fieldset>

          <fieldset className="space-y-4 rounded-lg border border-ink-100 bg-white p-6">
            <legend className="px-1 font-display text-lg">Galeria</legend>
            <ul className="flex flex-wrap gap-3">
              {book.gallery.map((src) => (
                <li key={src} className="relative w-20">
                  <img src={src} alt="" className="aspect-[2/3] w-full rounded object-cover" />
                  <button type="button" onClick={() => set('gallery', book.gallery.filter((g) => g !== src))} className="absolute -right-2 -top-2 rounded-full bg-ink-950 p-1 text-white" aria-label="Remover imagem">
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
            <ImageUpload label="Adicionar imagem" folder="covers" onUploaded={(url) => set('gallery', [...book.gallery, url])} />
          </fieldset>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-lg border border-ink-100 bg-white p-5">
            <p className="mb-3 text-sm font-medium">Capa</p>
            <BookCover book={book} authorName={author?.name} />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ImageUpload label={book.coverUrl ? 'Substituir' : 'Carregar capa'} folder="covers" onUploaded={(url) => set('coverUrl', url)} />
              {book.coverUrl && <Button variant="ghost" size="sm" onClick={() => set('coverUrl', null)}>Remover</Button>}
            </div>
            {!book.coverUrl && (
              <label className="mt-3 flex items-center gap-2 text-sm text-ink-600">
                Cor da capa gerada
                <input type="color" value={book.coverColor} onChange={(e) => set('coverColor', e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-ink-200" />
              </label>
            )}
          </div>
          <div className="rounded-lg border border-ink-100 bg-white p-5">
            <Checkbox label="Publicado (visível na loja)" checked={book.published} onChange={(e) => set('published', e.target.checked)} />
          </div>
          {saveError && <Notice tone="error">{saveError}</Notice>}
          <Button type="submit" size="lg" className="w-full" loading={saving}>
            {isNew ? 'Criar livro' : 'Guardar alterações'}
          </Button>
        </aside>
      </form>
    </>
  );
}
