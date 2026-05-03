'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';
import { useTopContributors } from '@/lib/hooks/use-admin-stats';

type Range = 7 | 30 | 90;

const ROLE_VARIANT: Record<string, string> = {
  SUPER_ADMIN: 'bg-terracotta/10 text-terracotta border-terracotta/20',
  ADMIN: 'bg-deep-blue/10 text-deep-blue border-deep-blue/20',
  MODERATOR: 'bg-forest/10 text-forest border-forest/20',
  USER: 'bg-charcoal/5 text-charcoal/70 border-charcoal/10',
};

function roleBadgeClass(role: string): string {
  return ROLE_VARIANT[role.toUpperCase()] ?? ROLE_VARIANT.USER;
}

export const TopContributorsList: React.FC = () => {
  const t = useT();
  const [range, setRange] = useState<Range>(30);
  const { data, isLoading, isError } = useTopContributors({ limit: 10, days: range });

  const ranges: { value: Range; label: string }[] = [
    { value: 7, label: t('admin.dashboard.growth.range7') },
    { value: 30, label: t('admin.dashboard.growth.range30') },
    { value: 90, label: t('admin.dashboard.growth.range90') },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold text-charcoal">
          {t('admin.dashboard.contributors.title')}
        </CardTitle>
        <div className="inline-flex rounded-md border border-charcoal/10 bg-off-white p-0.5">
          {ranges.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition',
                range === r.value
                  ? 'bg-deep-blue text-white shadow-sm'
                  : 'text-charcoal/70 hover:text-charcoal',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {t('admin.dashboard.contributors.error')}
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-charcoal/60">
            {t('admin.dashboard.contributors.empty')}
          </p>
        ) : (
          <ol className="space-y-2">
            {data.items.map((c, idx) => {
              const rank = idx + 1;
              const display = c.fullName?.trim() || c.phoneNumberMasked;
              return (
                <li
                  key={c.accountId}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-off-white"
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                      rank <= 3
                        ? 'bg-ochre/15 text-ochre'
                        : 'bg-charcoal/5 text-charcoal/70',
                    )}
                  >
                    {rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-charcoal">{display}</p>
                    {c.fullName && c.fullName.trim() ? (
                      <p className="truncate text-xs text-charcoal/50">
                        {c.phoneNumberMasked}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px]', roleBadgeClass(c.role))}
                  >
                    {c.role}
                  </Badge>
                  <span className="w-12 text-right text-sm font-semibold text-charcoal tabular-nums">
                    {c.contributionCount}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};
