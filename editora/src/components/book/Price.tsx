import { formatMoney } from '../../lib/format';
import { cn } from '../../lib/cn';

interface PriceProps {
  value: number;
  previous?: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Preço atual com o preço anterior riscado quando há poupança. */
export function Price({ value, previous, size = 'md', className }: PriceProps) {
  const showPrevious = previous != null && previous > value;
  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('font-semibold text-fg', size === 'lg' ? 'font-display text-3xl' : size === 'md' ? 'text-lg' : 'text-sm')}>
        {formatMoney(value)}
      </span>
      {showPrevious && (
        <>
          <span className="sr-only">Preço anterior:</span>
          <s className={cn('text-muted', size === 'lg' ? 'text-lg' : 'text-sm')}>{formatMoney(previous)}</s>
          {size === 'lg' && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-hover">
              Poupa {formatMoney(previous - value)}
            </span>
          )}
        </>
      )}
    </p>
  );
}
