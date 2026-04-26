'use client';

import { cn } from '@/lib/utils';

interface SparkbarProps {
  data: Array<{ label: string; value: number }>;
  className?: string;
  height?: number;
  /** Short label rendered under each bar (e.g. month abbreviation). */
  formatTick?: (label: string) => string;
}

/**
 * Tiny vertical bar series (think GitHub contributions) suited for showing
 * "additions per month over the last N months". Values render as relative
 * fills against the period max so an empty month is still visible as an
 * outlined empty box.
 */
export function Sparkbar({ data, className, height = 80, formatTick }: SparkbarProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full max-w-[28px] rounded-t-sm bg-forest/90 transition-all"
                style={{ height: `${Math.max(4, pct)}%`, minHeight: 4 }}
                title={`${d.label}: ${d.value}`}
              />
              <span className="text-[10px] text-charcoal/55">
                {formatTick ? formatTick(d.label) : d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
