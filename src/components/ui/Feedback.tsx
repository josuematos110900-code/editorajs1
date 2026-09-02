import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin text-brand-500 ${className}`} />;
}

export function FullPageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-ink-50 dark:bg-ink-950">
      <Spinner size={32} />
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center mb-4">
        <Icon size={26} />
      </div>
      <h3 className="font-display font-semibold text-ink-900 dark:text-white">{title}</h3>
      <p className="text-sm text-ink-500 dark:text-ink-400 mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ProgressBarProps {
  percent: number;
  colorClass?: string;
  trackClass?: string;
}

export function ProgressBar({ percent, colorClass = 'bg-brand-500', trackClass = 'bg-ink-100 dark:bg-ink-800' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`h-2 w-full rounded-full ${trackClass} overflow-hidden`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-xl bg-coral-500/10 border border-coral-500/30 text-coral-600 dark:text-coral-400 text-sm px-3.5 py-2.5">
      {message}
    </div>
  );
}
