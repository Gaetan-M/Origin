'use client';

import { cn } from '@/lib/utils';

interface BarListProps {
  data: Array<{ label: string; value: number }>;
  className?: string;
  emptyLabel?: string;
}

/**
 * Compact horizontal bar list — one row per item with a colored fill
 * proportional to the largest value. No SVG, just flex + width % so it's
 * crisp at any zoom level.
 */
export function BarList({ data, className, emptyLabel = 'Pas de donnees' }: BarListProps) {
  if (data.length === 0) {
    return <p className={cn('text-sm text-charcoal/55', className)}>{emptyLabel}</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className={cn('space-y-2', className)}>
      {data.map((row) => {
        const pct = (row.value / max) * 100;
        return (
          <li key={row.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-charcoal/80">{row.label}</span>
              <span className="tabular-nums font-medium text-charcoal">{row.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-gradient-to-r from-forest to-forest/70 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
