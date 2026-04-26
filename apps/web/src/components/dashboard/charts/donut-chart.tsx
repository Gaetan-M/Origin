'use client';

import { cn } from '@/lib/utils';

export interface DonutSegment {
  label: string;
  value: number;
  /** Tailwind text class used for the segment fill (e.g. "text-forest"). */
  colorClass: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSubLabel?: string;
  className?: string;
}

/**
 * Tiny inline-SVG donut. Uses stroke-dasharray to draw segments without any
 * dependency on a chart library. We compute each arc as a fraction of the
 * 2π circumference and rotate the start of every segment so they meet end-to-end.
 */
export function DonutChart({
  segments,
  size = 160,
  thickness = 18,
  centerLabel,
  centerSubLabel,
  className,
}: DonutChartProps) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const radius = size / 2 - thickness / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-charcoal/40', className)}
        style={{ width: size, height: size }}
      >
        <div className="text-center">
          <div className="text-2xl font-semibold">0</div>
          <div className="text-xs">Aucune donnee</div>
        </div>
      </div>
    );
  }

  let cumulative = 0;
  return (
    <div className={cn('relative inline-flex', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          className="text-sand"
        />
        {segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const fraction = seg.value / total;
          const length = fraction * circumference;
          const offset = (cumulative / total) * circumference;
          cumulative += seg.value;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={thickness}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              className={seg.colorClass}
            />
          );
        })}
      </svg>
      {(centerLabel || centerSubLabel) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && (
            <span className="text-2xl font-bold text-charcoal">{centerLabel}</span>
          )}
          {centerSubLabel && (
            <span className="text-xs text-charcoal/55">{centerSubLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function DonutLegend({ segments }: { segments: DonutSegment[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  return (
    <ul className="space-y-1.5 text-sm">
      {segments.map((seg) => (
        <li key={seg.label} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-charcoal/75">
            <span className={cn('h-2.5 w-2.5 rounded-full bg-current', seg.colorClass)} />
            {seg.label}
          </span>
          <span className="tabular-nums font-medium text-charcoal">
            {seg.value}
            {total > 0 && (
              <span className="ml-1 text-xs text-charcoal/55">
                ({Math.round((seg.value / total) * 100)}%)
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
