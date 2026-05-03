'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr as frLocale, enUS as enLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';
import { useUiStore } from '@/stores/ui-store';
import { useRecentActivity } from '@/lib/hooks/use-admin-stats';
import type { RecentActivityItem } from '@/lib/api/admin-stats';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-forest/10 text-forest border-forest/20',
  UPDATE: 'bg-deep-blue/10 text-deep-blue border-deep-blue/20',
  DELETE: 'bg-terracotta/10 text-terracotta border-terracotta/20',
  MERGE: 'bg-ochre/10 text-ochre border-ochre/20',
};

function getActionColor(action: string): string {
  return ACTION_COLORS[action.toUpperCase()] ?? 'bg-charcoal/5 text-charcoal/70 border-charcoal/10';
}

function detailHref(item: RecentActivityItem): string | null {
  if (item.entityType === 'person') return `/persons/${item.entityId}`;
  return null;
}

export const RecentActivityFeed: React.FC = () => {
  const t = useT();
  const locale = useUiStore((s) => s.locale);
  const dateLocale = locale === 'fr' ? frLocale : enLocale;
  const { data, isLoading, isError } = useRecentActivity(20);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-charcoal">
          {t('admin.dashboard.activity.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {t('admin.dashboard.activity.error')}
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-2 w-2 mt-2 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-charcoal/60">
            {t('admin.dashboard.activity.empty')}
          </p>
        ) : (
          <ol className="relative space-y-4 pl-4">
            <span
              className="absolute left-1 top-1 bottom-1 w-px bg-charcoal/10"
              aria-hidden
            />
            {data.items.map((item) => {
              const href = detailHref(item);
              const timeAgo = (() => {
                try {
                  return formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true,
                    locale: dateLocale,
                  });
                } catch {
                  return item.createdAt;
                }
              })();

              const content = (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        getActionColor(item.action),
                      )}
                    >
                      {item.action}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {item.entityType}
                    </Badge>
                    {item.fieldName ? (
                      <span className="text-xs text-charcoal/60">
                        · {item.fieldName}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-charcoal">
                    <span className="font-medium">{item.phoneNumberMasked}</span>
                    {item.personDisplayName ? (
                      <>
                        {' '}
                        <span className="text-charcoal/70">— {item.personDisplayName}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-charcoal/50">{timeAgo}</p>
                </>
              );

              return (
                <li key={item.id} className="relative">
                  <span
                    className="absolute -left-[11px] top-1.5 h-2 w-2 rounded-full bg-deep-blue ring-2 ring-white"
                    aria-hidden
                  />
                  {href ? (
                    <Link
                      href={href}
                      className="block rounded-md p-2 -m-2 transition-colors hover:bg-off-white"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="p-2 -m-2">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};
