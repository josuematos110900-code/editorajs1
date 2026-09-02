import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-sm">
      <div className="flex gap-3">
        {danger && (
          <div className="shrink-0 w-10 h-10 rounded-full bg-coral-500/10 text-coral-500 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        )}
        <p className="text-sm text-ink-600 dark:text-ink-300">{message}</p>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button className="btn-ghost" onClick={onCancel} disabled={loading}>
          Cancelar
        </button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
          {loading ? 'A processar…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
