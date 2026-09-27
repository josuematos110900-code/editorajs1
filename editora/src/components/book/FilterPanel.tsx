import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/** Grupo de filtros em lista de opções (rádio): tudo visível, um toque para escolher. */
export function FilterGroup({ legend, name, value, options, onChange }: { legend: string; name: string; value: string; options: FilterOption[]; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-labelledby={`${name}-titulo`} className="border-b border-line py-5 first:pt-0 last:border-0 last:pb-0">
      <p id={`${name}-titulo`} className="t-caption mb-3">{legend}</p>
      <div className="space-y-0.5">
        {[{ value: '', label: 'Todos' }, ...options].map((o) => {
          const checked = value === o.value;
          return (
            <label key={o.value || 'todos'} className={cn('flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded px-2 t-small transition-colors hover:bg-surface-alt', checked ? 'font-medium text-fg' : 'text-fg/80')}>
              <span className="flex items-center gap-2.5">
                <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="h-4 w-4 accent-[#8C2F1B]" />
                {o.label}
              </span>
              {o.count !== undefined && <span className="text-xs tabular-nums text-muted">{o.count}</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function FilterPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-card border border-line bg-surface p-5', className)} role="group" aria-label="Filtros">
      {children}
    </div>
  );
}
