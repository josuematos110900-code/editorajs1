import { cn } from '../../lib/cn';
import { availabilityLabels, preorderStateLabels, type Availability } from '../../lib/preorder';
import type { PreorderState } from '../../types';

const preorderStyles: Record<PreorderState, string> = {
  em_breve: 'bg-gilt-100 text-gilt-600',
  aberta: 'bg-seal-700 text-white',
  encerrada: 'bg-ink-100 text-ink-600',
  esgotada: 'bg-ink-900 text-paper-50',
};

export function PreorderBadge({ state, className }: { state: PreorderState; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', preorderStyles[state], className)}>
      Pré-venda · {preorderStateLabels[state]}
    </span>
  );
}

const availabilityStyles: Record<Availability, string> = {
  pre_venda: 'bg-seal-700 text-white',
  disponivel: 'bg-leaf-100 text-leaf-800',
  esgotado: 'bg-ink-100 text-ink-600',
  brevemente: 'bg-gilt-100 text-gilt-600',
};

export function AvailabilityBadge({ availability, className }: { availability: Availability; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', availabilityStyles[availability], className)}>
      {availabilityLabels[availability]}
    </span>
  );
}
