import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, FileAudio, FileText, Trash2, Upload } from 'lucide-react';
import { api } from '../../data';
import type { DigitalFile, DigitalKind } from '../../types';
import { Notice } from '../ui/Feedback';

const accept: Record<DigitalKind, string> = {
  ebook: 'application/pdf,application/epub+zip,.pdf,.epub',
  audiolivro: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/ogg,.mp3,.m4a,.aac,.wav,.ogg',
};

function size(bytes: number | null) {
  if (!bytes) return '';
  return bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

/**
 * Ficheiros de uma edição digital. Ficam no armazenamento PRIVADO: só os
 * clientes que pagaram obtêm um link temporário.
 */
export function DigitalFilesManager({ bookId, kind, files, onChanged }: { bookId: string; kind: DigitalKind; files: DigitalFile[]; onChanged: () => void }) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sorted = [...files].sort((a, b) => a.position - b.position);
  const Icon = kind === 'ebook' ? FileText : FileAudio;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro.');
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const a = sorted[index];
    const b = sorted[index + dir];
    if (!a || !b) return;
    await run(async () => {
      await api.admin.renameDigitalFile(a.id, a.title, b.position);
      await api.admin.renameDigitalFile(b.id, b.title, a.position);
    });
  }

  return (
    <div>
      {sorted.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong/60 px-4 py-3 t-small text-muted">
          Sem ficheiros. {kind === 'ebook' ? 'Carregue o PDF ou EPUB.' : 'Carregue as faixas (uma por capítulo, ou um ficheiro único).'} Sem ficheiro, esta edição não é vendida.
        </p>
      ) : (
        <ol className="divide-y divide-line rounded-md border border-line">
          {sorted.map((f, i) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2 t-small">
              <Icon size={16} className="shrink-0 text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-fg">{f.title}</span>
              <span className="shrink-0 text-xs text-muted">{size(f.sizeBytes)}</span>
              {kind === 'audiolivro' && (
                <>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded hover:bg-surface-alt disabled:opacity-30" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Subir «${f.title}»`}>
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded hover:bg-surface-alt disabled:opacity-30" disabled={busy || i === sorted.length - 1} onClick={() => move(i, 1)} aria-label={`Descer «${f.title}»`}>
                    <ArrowDown size={15} />
                  </button>
                </>
              )}
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded text-danger hover:bg-danger-soft disabled:opacity-30"
                disabled={busy}
                onClick={() => confirm(`Eliminar «${f.title}»? Os clientes que já compraram deixam de ter acesso a este ficheiro.`) && run(() => api.admin.deleteDigitalFile(f.id))}
                aria-label={`Eliminar «${f.title}»`}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ol>
      )}
      <label htmlFor={inputId} className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-line-strong/70 bg-surface px-3 text-sm font-medium hover:border-line-strong">
        <Upload size={15} aria-hidden="true" /> {busy ? 'A carregar…' : kind === 'ebook' ? 'Carregar e-book' : 'Carregar faixas de áudio'}
      </label>
      <input
        id={inputId}
        type="file"
        accept={accept[kind]}
        multiple={kind === 'audiolivro'}
        className="sr-only"
        disabled={busy}
        onChange={async (e) => {
          const chosen = [...(e.target.files ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt', { numeric: true }));
          e.target.value = '';
          if (!chosen.length) return;
          await run(async () => {
            for (const file of chosen) await api.admin.uploadDigitalFile(bookId, kind, file, file.name.replace(/\.[^.]+$/, ''));
          });
        }}
      />
      {error && <Notice tone="error" className="mt-3">{error}</Notice>}
    </div>
  );
}
