import { useId, useState } from 'react';
import { Upload } from 'lucide-react';
import { api } from '../../data';

/** Carregamento de imagem para o armazenamento (capas, galeria, fotografias). */
export function ImageUpload({ label, folder, onUploaded }: { label: string; folder: 'covers' | 'authors'; onUploaded: (url: string) => void }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <div>
      <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-medium hover:border-ink-400">
        <Upload size={15} aria-hidden="true" /> {busy ? 'A carregar…' : label}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setBusy(true);
          setError('');
          try {
            onUploaded(await api.admin.uploadImage(file, folder));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Falha no carregamento.');
          } finally {
            setBusy(false);
          }
        }}
      />
      {error && <p className="mt-1 text-sm text-seal-700" role="alert">{error}</p>}
    </div>
  );
}
