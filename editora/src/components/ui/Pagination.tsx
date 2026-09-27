import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null;
  const btn = 'flex h-11 min-w-11 items-center justify-center rounded-md px-3 t-small transition-colors';
  return (
    <nav aria-label="Paginação" className="mt-14 flex items-center justify-center gap-1">
      <button type="button" className={cn(btn, 'hover:bg-surface-alt disabled:opacity-40')} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">
        <ChevronLeft size={18} />
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          aria-label={`Página ${p}`}
          className={cn(btn, p === page ? 'bg-secondary font-semibold text-background' : 'text-fg hover:bg-surface-alt')}
        >
          {p}
        </button>
      ))}
      <button type="button" className={cn(btn, 'hover:bg-surface-alt disabled:opacity-40')} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Página seguinte">
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
