import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ToastItem {
  id: number;
  tone: 'success' | 'error';
  message: string;
  action?: { label: string; to: string };
}

const ToastContext = createContext<((t: Omit<ToastItem, 'id'>) => void) | undefined>(undefined);

/** Feedback breve depois de uma ação (adicionar ao carrinho, guardar…). Anunciado a leitores de ecrã. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(0);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = ++next.current;
      setItems((all) => [...all.slice(-2), { ...t, id }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end" aria-live="polite" role="status">
        {items.map((t) => {
          const Icon = t.tone === 'success' ? CheckCircle2 : AlertCircle;
          return (
            <div key={t.id} className={cn('pointer-events-auto flex w-full max-w-sm animate-slide-in items-center gap-3 rounded-card bg-secondary px-4 py-3 text-background shadow-book-lg')}>
              <Icon size={18} className={t.tone === 'success' ? 'text-success-soft' : 'text-primary-soft'} aria-hidden="true" />
              <p className="flex-1 t-small">{t.message}</p>
              {t.action && (
                <Link to={t.action.to} className="t-small font-semibold underline underline-offset-4" onClick={() => dismiss(t.id)}>
                  {t.action.label}
                </Link>
              )}
              <button type="button" onClick={() => dismiss(t.id)} className="-mr-1 rounded p-1.5 text-background/70 hover:text-background" aria-label="Fechar notificação">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast fora de ToastProvider');
  return ctx;
}
