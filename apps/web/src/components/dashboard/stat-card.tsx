'use client';

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  iconClass?: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  iconClass,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            iconClass ?? 'bg-forest/10 text-forest',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-charcoal/55">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-charcoal">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-charcoal/55">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
