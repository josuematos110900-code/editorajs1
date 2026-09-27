import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(total / 86400), hours: Math.floor((total % 86400) / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 };
}

/** Contador até uma data. Atualiza a cada segundo; anuncia só o texto final a leitores de ecrã. */
export function Countdown({ to, label, compact, className }: { to: string; label: string; compact?: boolean; className?: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (target <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  const p = parts(target - now);
  const units = [
    { value: p.days, label: 'dias' },
    { value: p.hours, label: 'horas' },
    { value: p.minutes, label: 'min' },
    { value: p.seconds, label: 'seg' },
  ];
  const summary = `${label}: ${p.days} dias, ${p.hours} horas e ${p.minutes} minutos`;

  if (compact) {
    return (
      <p className={cn('text-sm text-ink-600', className)}>
        {label}: <span className="font-semibold tabular-nums text-ink-900">{p.days}d {String(p.hours).padStart(2, '0')}h {String(p.minutes).padStart(2, '0')}m</span>
      </p>
    );
  }

  return (
    <div className={className}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500" aria-hidden="true">
        {label}
      </p>
      <span className="sr-only">{summary}</span>
      <div className="grid grid-cols-4 gap-2" aria-hidden="true">
        {units.map((u) => (
          <div key={u.label} className="rounded-md border border-ink-100 bg-white px-2 py-2.5 text-center">
            <p className="font-display text-2xl tabular-nums text-ink-950">{String(u.value).padStart(2, '0')}</p>
            <p className="text-[11px] uppercase tracking-wider text-ink-500">{u.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
