import { Check } from 'lucide-react';
import { cn } from '../lib/cn';
import { orderFlow, orderStatusLabels, paymentStatusLabels } from '../lib/orderStatus';
import type { OrderStatus as Status, PaymentStatus } from '../types';
import { Badge, type BadgeTone } from './ui/Badge';

const badgeTones: Record<Status, BadgeTone> = {
  pendente: 'warning',
  pagamento_confirmado: 'success',
  em_preparacao: 'success',
  enviado: 'dark',
  entregue: 'success',
  cancelado: 'neutral',
  reembolsado: 'danger',
};

export function OrderStatusBadge({ status }: { status: Status }) {
  return <Badge tone={badgeTones[status]}>{orderStatusLabels[status]}</Badge>;
}

const paymentStyles: Record<PaymentStatus, string> = {
  pendente: 'text-warning',
  aprovado: 'text-success',
  recusado: 'text-danger',
  cancelado: 'text-muted',
  reembolsado: 'text-danger',
};

export function PaymentStatusText({ status }: { status: PaymentStatus }) {
  return <span className={cn('text-sm font-medium', paymentStyles[status])}>{paymentStatusLabels[status]}</span>;
}

/** Linha temporal da encomenda para o cliente. */
export function OrderTimeline({ status }: { status: Status }) {
  if (status === 'cancelado' || status === 'reembolsado') {
    return (
      <p className="rounded-md bg-surface-alt px-4 py-3 text-sm text-fg/85">
        Esta encomenda foi <strong>{orderStatusLabels[status].toLowerCase()}</strong>.
      </p>
    );
  }
  const current = orderFlow.indexOf(status);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Estado da encomenda">
      {orderFlow.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step} className="flex flex-col items-center text-center" aria-current={i === current ? 'step' : undefined}>
            <div className="flex w-full items-center">
              <div className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done ? 'bg-success' : 'bg-line')} />
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2', done ? 'border-success bg-success text-white' : 'border-line bg-surface text-muted')}>
                {done ? <Check size={14} aria-hidden="true" /> : <span className="text-xs">{i + 1}</span>}
              </span>
              <div className={cn('h-0.5 flex-1', i === orderFlow.length - 1 ? 'bg-transparent' : i < current ? 'bg-success' : 'bg-line')} />
            </div>
            <span className={cn('mt-2 text-[11px] leading-tight sm:text-xs', done ? 'font-medium text-fg' : 'text-muted')}>
              {orderStatusLabels[step]}
              <span className="sr-only">{done ? ' (concluído)' : ' (por fazer)'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
