import { cn } from '../../lib/cn';
import type { ReactNode } from 'react';

export function StatCard({ label, value, hint, icon, className }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-card border border-line bg-surface p-5', className)}>
      <div className="flex items-center justify-between text-muted">
        <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
        <span aria-hidden="true">{icon}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-medium text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
