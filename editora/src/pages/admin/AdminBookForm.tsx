import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { z } from 'zod';
import { bookToInput } from '../../components/admin/bookInput';
import { DigitalFilesManager } from '../../components/admin/DigitalFilesManager';
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

const schema = z.object({
  title: z.string().trim().min(1, 'Indique o título.'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Só minúsculas, números e hífens.'),
  authorId: z.string().min(1, 'Escolha o autor.'),
  synopsis: z.string().trim().min(10, 'Escreva uma sinopse (mín. 10 caracteres).'),
  price: z.string().regex(/^\d*$/, 'Indique o preço (inteiro, em Kz).'),
  stock: z.string().regex(/^\d*$/, 'Indique o stock (inteiro).'),
  pages: z.string().regex(/^\d*$/, 'Número inteiro.'),
  compareAtPrice: z.string().regex(/^\d*$/, 'Número inteiro.'),
  ebookPrice: z.string().regex(/^\d*$/, 'Número inteiro (Kz).'),
  audiobookPrice: z.string().regex(/^\d*$/, 'Número inteiro (Kz).'),
  audiobookMinutes: z.string().regex(/^\d*$/, 'Número inteiro de minutos.'),
  formats: z.array(z.string()),
}).superRefine((v, ctx) => {
  const physical = v.formats.some((f) => f === 'capa_mole' || f === 'capa_dura');
  if (!physical && !v.ebookPrice && !v.audiobookPrice) {
    ctx.addIssue({ code: 'custom', message: 'Escolha a edição impressa ou indique o preço do e-book ou do audiolivro.', path: ['formats'] });
  }
  if (physical && !v.price) ctx.addIssue({ code: 'custom', message: 'Indique o preço do livro físico.', path: ['price'] });
  if (physical && !v.stock) ctx.addIssue({ code: 'custom', message: 'Indique o stock.', path: ['stock'] });
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
  language: 'Português',
  publisher: site.name,
  publicationDate: null,
  formats: ['capa_mole'],
  price: 0,
  compareAtPrice: null,
  stock: 0,
  ebookPrice: null,
  audiobookPrice: null,
  audiobookNarrator: null,
  audiobookMinutes: null,
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
  const { data, loading, error, reload } = useAsync(() => api.admin.getCatalog(), []);
  const [book, setBook] = useState<BookInput>(empty);
  const [nums, setNums] = useState({ price: '', stock: '0', pages: '', compareAtPrice: '', ebookPrice: '', audiobookPrice: '', audiobookMinutes: '' });
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
        ebookPrice: existing.ebookPrice?.toString() ?? '',
        audiobookPrice: existing.audiobookPrice?.toString() ?? '',
        audiobookMinutes: existing.audiobookMinutes?.toString() ?? '',
      });
    }
  }, [data, id, isNew]);

  if (loading) return <Spinner />;
  if (error || !data) return <Notice tone="error">{error}</Notice>;
  if (!isNew && !data.books.some((b) => b.id === id)) return <Notice tone="error">Livro não encontrado.</Notice>;

  const set = <K extends keyof BookInput>(key: K, value: BookInput[K]) => setBook((b) => ({ ...b, [key]: value }));
  const author = data.authors.find((a) => a.id === book.authorId);
  const hasPhysicalEdition = book.formats.some((f) => f === 'capa_mole' || f === 'capa_dura');

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
        price: Number(nums.price || 0),
        stock: Number(nums.stock || 0),
        ebookPrice: nums.ebookPrice ? Number(nums.ebookPrice) : null,
        audiobookPrice: nums.audiobookPrice ? Number(nums.audiobookPrice) : null,
        audiobookMinutes: nums.audiobookMinutes ? Number(nums.audiobookMinutes) : null,
        audiobookNarrator: book.audiobookNarrator?.trim() || null,
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
      <Link to="/admin/livros" className="mb-2 inline-flex min-h-10 items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft size={15} aria-hidden="true" /> Livros
      </Link>
      <AdminPageHeader title={isNew ? 'Novo livro' : book.title || 'Editar livro'} />
      <form onSubmit={onSubmit} noValidate className="grid gap-8 xl:grid-cols-[1fr_18rem]">
        <div className="space-y-8">
          <fieldset className="space-y-4 rounded-card border border-line bg-surface p-6">
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

          <fieldset className="space-y-4 rounded-card border border-line bg-surface p-6">
            <legend className="px-1 font-display text-lg">Ficha técnica</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="ISBN" value={book.isbn ?? ''} onChange={(e) => set('isbn', e.target.value)} />
              <TextField label="Número de páginas" inputMode="numeric" value={nums.pages} onChange={(e) => setNums((n) => ({ ...n, pages: e.target.value }))} error={errors.pages} />
              <TextField label="Editora" value={book.publisher} onChange={(e) => set('publisher', e.target.value)} />
              <TextField label="Idioma" value={book.language} onChange={(e) => set('language', e.target.value)} />
              <TextField label="Data de publicação / lançamento" type="date" value={book.publicationDate ?? ''} onChange={(e) => set('publicationDate', e.target.value || null)} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-fg">Edição impressa</p>
              <div className="flex flex-wrap gap-5">
                {(['capa_mole', 'capa_dura'] as BookFormat[]).map((f) => (
                  <Checkbox
                    key={f}
                    label={formatLabels[f]}
                    checked={book.formats.includes(f)}
                    onChange={(e) => set('formats', e.target.checked ? [...book.formats, f] : book.formats.filter((x) => x !== f))}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">Deixe ambas por marcar se o livro for só digital.</p>
              {errors.formats && <p className="mt-1 text-sm text-danger" role="alert">{errors.formats}</p>}
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-card border border-line bg-surface p-6">
            <legend className="px-1 font-display text-lg">Livro físico — preço e stock</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Preço (Kz)" inputMode="numeric" value={nums.price} onChange={(e) => setNums((n) => ({ ...n, price: e.target.value }))} error={errors.price} required={hasPhysicalEdition} />
              <TextField label="Preço anterior (Kz)" inputMode="numeric" value={nums.compareAtPrice} onChange={(e) => setNums((n) => ({ ...n, compareAtPrice: e.target.value }))} error={errors.compareAtPrice} hint="Aparece riscado." />
              <TextField label="Stock" inputMode="numeric" value={nums.stock} onChange={(e) => setNums((n) => ({ ...n, stock: e.target.value }))} error={errors.stock} required={hasPhysicalEdition} />
            </div>
            <p className="text-xs text-muted">Preço especial, datas e limite de pré-venda geridos em «Pré-vendas».</p>
          </fieldset>

          <fieldset className="space-y-6 rounded-card border border-line bg-surface p-6">
            <legend className="px-1 font-display text-lg">Edições digitais</legend>
            <p className="t-small text-muted">
              Deixe o preço vazio para não vender essa edição. Uma edição digital só aparece à venda depois do lançamento e com pelo menos um ficheiro carregado.
              Os ficheiros ficam privados: só quem pagou os pode abrir.
            </p>
            <div>
              <h3 className="t-h4">E-book</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <TextField label="Preço do e-book (Kz)" inputMode="numeric" value={nums.ebookPrice} onChange={(e) => setNums((n) => ({ ...n, ebookPrice: e.target.value }))} error={errors.ebookPrice} />
              </div>
              <div className="mt-4">
                {book.id || !isNew ? (
                  <DigitalFilesManager bookId={id!} kind="ebook" files={data.digitalFiles.filter((f) => f.bookId === id && f.kind === 'ebook')} onChanged={() => { reload(); void reloadPublic(); }} />
                ) : (
                  <p className="t-small text-muted">Guarde o livro primeiro para carregar os ficheiros.</p>
                )}
              </div>
            </div>
            <div className="border-t border-line pt-6">
              <h3 className="t-h4">Audiolivro</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <TextField label="Preço do audiolivro (Kz)" inputMode="numeric" value={nums.audiobookPrice} onChange={(e) => setNums((n) => ({ ...n, audiobookPrice: e.target.value }))} error={errors.audiobookPrice} />
                <TextField label="Narração" value={book.audiobookNarrator ?? ''} onChange={(e) => set('audiobookNarrator', e.target.value)} />
                <TextField label="Duração (minutos)" inputMode="numeric" value={nums.audiobookMinutes} onChange={(e) => setNums((n) => ({ ...n, audiobookMinutes: e.target.value }))} error={errors.audiobookMinutes} />
              </div>
              <div className="mt-4">
                {book.id || !isNew ? (
                  <DigitalFilesManager bookId={id!} kind="audiolivro" files={data.digitalFiles.filter((f) => f.bookId === id && f.kind === 'audiolivro')} onChanged={() => { reload(); void reloadPublic(); }} />
                ) : (
                  <p className="t-small text-muted">Guarde o livro primeiro para carregar os ficheiros.</p>
                )}
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-card border border-line bg-surface p-6">
            <legend className="px-1 font-display text-lg">Galeria</legend>
            <ul className="flex flex-wrap gap-3">
              {book.gallery.map((src) => (
                <li key={src} className="relative w-20">
                  <img src={src} alt="" className="aspect-[2/3] w-full rounded object-cover" />
                  <button type="button" onClick={() => set('gallery', book.gallery.filter((g) => g !== src))} className="absolute -right-2 -top-2 rounded-full bg-secondary p-1 text-white" aria-label="Remover imagem">
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
            <ImageUpload label="Adicionar imagem" folder="covers" onUploaded={(url) => set('gallery', [...book.gallery, url])} />
          </fieldset>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-card border border-line bg-surface p-5">
            <p className="mb-3 text-sm font-medium">Capa</p>
            <BookCover book={book} authorName={author?.name} />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ImageUpload label={book.coverUrl ? 'Substituir' : 'Carregar capa'} folder="covers" onUploaded={(url) => set('coverUrl', url)} />
              {book.coverUrl && <Button variant="ghost" size="sm" onClick={() => set('coverUrl', null)}>Remover</Button>}
            </div>
            {!book.coverUrl && (
              <label className="mt-3 flex items-center gap-2 text-sm text-muted">
                Cor da capa gerada
                <input type="color" value={book.coverColor} onChange={(e) => set('coverColor', e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-line" />
              </label>
            )}
          </div>
          <div className="rounded-card border border-line bg-surface p-5">
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
