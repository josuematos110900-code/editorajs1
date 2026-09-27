import { availabilityLabels, preorderStateLabels, type Availability } from '../../lib/preorder';
import type { PreorderState } from '../../types';
import { Badge, type BadgeTone } from '../ui/Badge';

const preorderTones: Record<PreorderState, BadgeTone> = {
  em_breve: 'warning',
  aberta: 'primary',
  encerrada: 'neutral',
  esgotada: 'dark',
};

export function PreorderBadge({ state, className }: { state: PreorderState; className?: string }) {
  return (
    <Badge tone={preorderTones[state]} className={className} dot={state === 'aberta'}>
      Pré-venda {preorderStateLabels[state].toLowerCase()}
    </Badge>
  );
}

const availabilityTones: Record<Availability, BadgeTone> = {
  pre_venda: 'primary',
  disponivel: 'success',
  esgotado: 'neutral',
  brevemente: 'warning',
};

export function AvailabilityBadge({ availability, className }: { availability: Availability; className?: string }) {
  return (
    <Badge tone={availabilityTones[availability]} className={className} dot={availability === 'pre_venda'}>
      {availabilityLabels[availability]}
    </Badge>
  );
}
