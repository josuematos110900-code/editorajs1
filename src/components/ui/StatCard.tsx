import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass?: string;
  trend?: { value: number; label?: string };
  sub?: string;
}

export function StatCard({ label, value, icon: Icon, iconClass = 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400', trend, sub }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-500 dark:text-ink-400">{label}</p>
          <p className="font-display text-2xl font-bold text-ink-900 dark:text-white mt-1.5 tabular-nums">{value}</p>
          {sub && <p className="text-xs text-ink-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
          <Icon size={18} />
        </div>
      </div>
      {trend && (
        <div
          className={`inline-flex items-center gap-1 text-xs font-medium mt-3 ${
            trend.value >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-coral-600 dark:text-coral-400'
          }`}
        >
          {trend.value >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend.value)}% {trend.label ?? 'vs mês anterior'}
        </div>
      )}
    </div>
  );
}
