import { Check } from 'lucide-react';
import { cn } from '../lib/cn';
import { orderFlow, orderStatusLabels, paymentStatusLabels } from '../lib/orderStatus';
import type { OrderStatus as Status, PaymentStatus } from '../types';

const badgeStyles: Record<Status, string> = {
  pendente: 'bg-gilt-100 text-gilt-600',
  pagamento_confirmado: 'bg-leaf-100 text-leaf-800',
  em_preparacao: 'bg-leaf-100 text-leaf-800',
  enviado: 'bg-ink-900 text-paper-50',
  entregue: 'bg-leaf-700 text-white',
  cancelado: 'bg-ink-100 text-ink-600',
  reembolsado: 'bg-seal-100 text-seal-800',
};

export function OrderStatusBadge({ status }: { status: Status }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', badgeStyles[status])}>{orderStatusLabels[status]}</span>;
}

const paymentStyles: Record<PaymentStatus, string> = {
  pendente: 'text-gilt-600',
  aprovado: 'text-leaf-700',
  recusado: 'text-seal-700',
  cancelado: 'text-ink-500',
  reembolsado: 'text-seal-700',
};

export function PaymentStatusText({ status }: { status: PaymentStatus }) {
  return <span className={cn('text-sm font-medium', paymentStyles[status])}>{paymentStatusLabels[status]}</span>;
}

/** Linha temporal da encomenda para o cliente. */
export function OrderTimeline({ status }: { status: Status }) {
  if (status === 'cancelado' || status === 'reembolsado') {
    return (
      <p className="rounded-md bg-ink-100 px-4 py-3 text-sm text-ink-700">
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
              <div className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done ? 'bg-leaf-600' : 'bg-ink-200')} />
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2', done ? 'border-leaf-600 bg-leaf-600 text-white' : 'border-ink-200 bg-white text-ink-400')}>
                {done ? <Check size={14} aria-hidden="true" /> : <span className="text-xs">{i + 1}</span>}
              </span>
              <div className={cn('h-0.5 flex-1', i === orderFlow.length - 1 ? 'bg-transparent' : i < current ? 'bg-leaf-600' : 'bg-ink-200')} />
            </div>
            <span className={cn('mt-2 text-[11px] leading-tight sm:text-xs', done ? 'font-medium text-ink-900' : 'text-ink-500')}>
              {orderStatusLabels[step]}
              <span className="sr-only">{done ? ' (concluído)' : ' (por fazer)'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
