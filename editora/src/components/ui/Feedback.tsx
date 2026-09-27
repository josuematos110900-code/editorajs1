import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Badge } from './Badge';

export function Spinner({ label = 'A carregar…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-muted" role="status">
      <Loader2 className="animate-spin" size={20} aria-hidden="true" />
      <span className="t-small">{label}</span>
    </div>
  );
}

/** Esqueleto para grelhas de livros enquanto o catálogo carrega. */
export function BookGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] rounded-[3px] bg-surface-alt" />
          <div className="mt-4 h-3 w-16 rounded bg-surface-alt" />
          <div className="mt-3 h-4 w-3/4 rounded bg-surface-alt" />
          <div className="mt-2 h-3 w-1/2 rounded bg-surface-alt" />
        </div>
      ))}
    </div>
  );
}

type Tone = 'info' | 'success' | 'warning' | 'error';

const toneStyles: Record<Tone, string> = {
  info: 'border-line bg-surface text-fg',
  success: 'border-success/25 bg-success-soft text-success',
  warning: 'border-warning/25 bg-warning-soft text-warning',
  error: 'border-danger/25 bg-danger-soft text-danger',
};

const toneIcon = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: AlertCircle };

export function Notice({ tone = 'info', title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  const Icon = toneIcon[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-card border p-4 t-small', toneStyles[tone], className)}>
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
    <div className="rounded-card border border-dashed border-line-strong/60 px-6 py-16 text-center">
      <p className="t-h3">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md t-small text-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge tone="accent" className={cn('uppercase tracking-wider', className)}>
      Demonstração
    </Badge>
  );
}
