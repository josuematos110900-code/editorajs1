import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 60_000));
  return { days: Math.floor(total / 1440), hours: Math.floor((total % 1440) / 60), minutes: total % 60 };
}

/**
 * Contador discreto até uma data: dias, horas e minutos, sem segundos a
 * correr (atualiza a cada 30 s) — informa sem criar ansiedade artificial.
 */
export function Countdown({ to, label, compact, className }: { to: string; label: string; compact?: boolean; className?: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const p = parts(target - now);
  const summary = `${label}: ${p.days} dias, ${p.hours} horas e ${p.minutes} minutos`;

  if (compact) {
    return (
      <p className={cn('t-small text-muted', className)}>
        {label} <span className="font-medium tabular-nums text-fg">{p.days > 0 ? `${p.days} dias` : `${p.hours} h ${p.minutes} min`}</span>
      </p>
    );
  }

  const units = [
    { value: p.days, label: p.days === 1 ? 'dia' : 'dias' },
    { value: p.hours, label: p.hours === 1 ? 'hora' : 'horas' },
    { value: p.minutes, label: 'min' },
  ];

  return (
    <div className={className}>
      <p className="t-caption mb-2" aria-hidden="true">{label}</p>
      <span className="sr-only">{summary}</span>
      <div className="flex items-stretch divide-x divide-line rounded-md border border-line bg-surface" aria-hidden="true">
        {units.map((u) => (
          <div key={u.label} className="flex-1 px-3 py-2.5 text-center">
            <p className="font-display text-2xl leading-none tabular-nums text-fg sm:text-[1.75rem]">{String(u.value).padStart(2, '0')}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">{u.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
