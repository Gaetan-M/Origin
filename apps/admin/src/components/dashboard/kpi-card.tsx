'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type KpiAccent = 'forest' | 'deep-blue' | 'ochre' | 'terracotta' | 'error';

export interface KpiCardProps {
  label: string;
  value: number | string;
  sublabel?: string;
  trend?: { value: number; direction: 'up' | 'down' | 'flat' } | null;
  icon: LucideIcon;
  accent?: KpiAccent;
  isLoading?: boolean;
  onClick?: () => void;
}

const accentToText: Record<KpiAccent, string> = {
  forest: 'text-forest',
  'deep-blue': 'text-deep-blue',
  ochre: 'text-ochre',
  terracotta: 'text-terracotta',
  error: 'text-red-600',
};

const accentToBg: Record<KpiAccent, string> = {
  forest: 'bg-forest/10',
  'deep-blue': 'bg-deep-blue/10',
  ochre: 'bg-ochre/10',
  terracotta: 'bg-terracotta/10',
  error: 'bg-red-100',
};

function formatValue(value: number | string): string {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('fr-FR').format(value);
  }
  return value;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  sublabel,
  trend,
  icon: Icon,
  accent = 'deep-blue',
  isLoading = false,
  onClick,
}) => {
  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3 w-full">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </Card>
    );
  }

  const TrendIcon = trend?.direction === 'down' ? ArrowDown : ArrowUp;
  const trendColor =
    trend?.direction === 'up'
      ? 'text-forest'
      : trend?.direction === 'down'
        ? 'text-terracotta'
        : 'text-charcoal/60';

  return (
    <Card
      className={cn(
        'p-5 transition-shadow hover:shadow-md',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal/60">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-charcoal tabular-nums">
            {formatValue(value)}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend ? (
              <span className={cn('inline-flex items-center gap-0.5 font-medium', trendColor)}>
                <TrendIcon className="h-3 w-3" aria-hidden />
                {Math.abs(trend.value)}%
              </span>
            ) : null}
            {sublabel ? (
              <span className="text-charcoal/60 truncate">{sublabel}</span>
            ) : null}
          </div>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
            accentToBg[accent],
          )}
        >
          <Icon className={cn('h-5 w-5', accentToText[accent])} aria-hidden />
        </div>
      </div>
    </Card>
  );
};
