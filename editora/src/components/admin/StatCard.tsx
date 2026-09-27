import type { ReactNode } from 'react';

export function StatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-5">
      <div className="flex items-center justify-between text-ink-500">
        <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
        <span aria-hidden="true">{icon}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-medium text-ink-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
