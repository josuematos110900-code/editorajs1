import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Spinner({ label = 'A carregar…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-ink-500" role="status">
      <Loader2 className="animate-spin" size={20} aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

type Tone = 'info' | 'success' | 'error';

const toneStyles: Record<Tone, string> = {
  info: 'border-ink-200 bg-white text-ink-800',
  success: 'border-leaf-600/30 bg-leaf-100 text-leaf-800',
  error: 'border-seal-600/30 bg-seal-50 text-seal-800',
};

const toneIcon = { info: Info, success: CheckCircle2, error: AlertCircle };

export function Notice({ tone = 'info', title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  const Icon = toneIcon[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-lg border p-4 text-sm', toneStyles[tone], className)}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-200 px-6 py-16 text-center">
      <p className="font-display text-xl text-ink-900">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-500">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-gilt-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gilt-600', className)}>
      Demonstração
    </span>
  );
}
