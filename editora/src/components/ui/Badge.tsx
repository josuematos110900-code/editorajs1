import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'dark' | 'accent';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-alt text-fg/85',
  primary: 'bg-primary text-white',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  dark: 'bg-secondary text-background',
  accent: 'bg-accent-soft text-accent',
};

/** Etiqueta de estado. O texto comunica sempre o estado — a cor só reforça. */
export function Badge({ tone = 'neutral', children, className, dot }: { tone?: BadgeTone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
