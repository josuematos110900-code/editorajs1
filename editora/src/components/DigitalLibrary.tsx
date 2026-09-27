import { useEffect, useRef, useState } from 'react';
import { BookOpen, Download, Headphones, Loader2, Pause, Play } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { api } from '../data';
import { cn } from '../lib/cn';
import { editionLabels, formatDuration } from '../lib/editions';
import { formatDate } from '../lib/format';
import type { DigitalFile, LibraryItem } from '../types';
import { BookCover } from './book/BookCover';
import { Button, ButtonLink } from './ui/Button';
import { EmptyState, Notice } from './ui/Feedback';

/** Biblioteca: e-books para abrir/descarregar e audiolivros para ouvir no site. */
export function DigitalLibrary({ items }: { items: LibraryItem[] }) {
  const { bookById, authorById, filesFor } = useCatalog();

  if (items.length === 0) {
    return (
      <EmptyState title="A sua biblioteca está vazia" action={<ButtonLink to="/livros?formato=ebook">Ver e-books e audiolivros</ButtonLink>}>
        Os e-books e audiolivros que comprar aparecem aqui assim que o pagamento for confirmado.
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-5 lg:grid-cols-2">
      {items.map((item) => {
        const book = bookById(item.bookId);
        if (!book) return null;
        const files = filesFor(book.id, item.kind);
        return (
          <li key={`${item.bookId}:${item.kind}`} className="card flex flex-col gap-5 p-5 sm:flex-row">
            <div className="w-24 shrink-0">
              <BookCover book={book} size="sm" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="t-caption flex items-center gap-1.5">
                {item.kind === 'ebook' ? <BookOpen size={13} aria-hidden="true" /> : <Headphones size={13} aria-hidden="true" />}
                {editionLabels[item.kind]}
              </p>
              <h3 className="t-h4 mt-1">{book.title}</h3>
              <p className="t-small text-muted">
                {authorById(book.authorId)?.name}
                {item.kind === 'audiolivro' && book.audiobookMinutes ? ` · ${formatDuration(book.audiobookMinutes)}` : ''}
              </p>
              <p className="mt-1 text-xs text-muted">Comprado a {formatDate(item.purchasedAt)} · {item.orderNumber}</p>
              <div className="mt-4">
                {files.length === 0 ? (
                  <p className="t-small text-muted">Os ficheiros estão a ser preparados pela editora.</p>
                ) : item.kind === 'ebook' ? (
                  <EbookFiles files={files} />
                ) : (
                  <AudioPlayer files={files} />
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function EbookFiles({ files }: { files: DigitalFile[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function open(file: DigitalFile) {
    // A janela abre-se já (dentro do clique) para o browser não a bloquear;
    // o link temporário é pedido a seguir e só é dado a quem comprou.
    const win = window.open('', '_blank');
    setBusy(file.id);
    setError('');
    try {
      let url = await api.getDigitalFileUrl(file.id);
      // Modo demonstração: os ficheiros são data: URLs, que o Chrome não deixa
      // abrir numa janela — convertem-se num blob: (em produção são https:).
      if (url.startsWith('data:')) url = URL.createObjectURL(await (await fetch(url)).blob());
      if (win) win.location.replace(url);
      else window.location.assign(url);
    } catch (err) {
      win?.close();
      setError(err instanceof Error ? err.message : 'Não foi possível abrir o ficheiro.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {files.map((f) => (
          <Button key={f.id} size="sm" onClick={() => open(f)} loading={busy === f.id}>
            <Download size={15} aria-hidden="true" /> {files.length > 1 ? f.title : 'Abrir / descarregar'}
          </Button>
        ))}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}

function AudioPlayer({ files }: { files: DigitalFile[] }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [src, setSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');

  async function play(index: number) {
    if (index === current && audio.current) {
      if (audio.current.paused) void audio.current.play();
      else audio.current.pause();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const url = await api.getDigitalFileUrl(files[index].id);
      setCurrent(index);
      setSrc(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir a faixa.');
    } finally {
      setLoading(false);
    }
  }

  // Quando o link da faixa chega, começa a tocar.
  useEffect(() => {
    if (src && audio.current) void audio.current.play().catch(() => undefined);
  }, [src]);

  return (
    <div className="space-y-3">
      <ol className="divide-y divide-line rounded-md border border-line">
        {files.map((f, i) => {
          const active = i === current;
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => play(i)}
                className={cn('flex min-h-11 w-full items-center gap-3 px-3 text-left t-small transition-colors hover:bg-background', active && 'bg-background font-medium')}
                aria-label={`${active && playing ? 'Pausar' : 'Ouvir'} ${f.title}`}
              >
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', active ? 'bg-primary text-white' : 'bg-surface-alt text-fg')}>
                  {loading && active ? <Loader2 size={13} className="animate-spin" /> : active && playing ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
                </span>
                <span className="w-5 tabular-nums text-muted">{i + 1}</span>
                <span className="flex-1 truncate text-fg">{f.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <audio
        ref={audio}
        src={src || undefined}
        controls
        preload="none"
        className={cn('w-full', !src && 'hidden')}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          if (current !== null && current + 1 < files.length) void play(current + 1);
        }}
      >
        O seu browser não reproduz áudio.
      </audio>
      {src && current !== null && (
        <a href={src} download={files[current].title} className="inline-flex min-h-10 items-center gap-1.5 t-small text-muted underline underline-offset-4 hover:text-fg">
          <Download size={14} aria-hidden="true" /> Descarregar esta faixa
        </a>
      )}
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
