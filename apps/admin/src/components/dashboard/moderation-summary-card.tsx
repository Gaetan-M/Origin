'use client';

import { useRouter } from 'next/navigation';
import { GitMerge, ShieldCheck, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';
import { useKpis } from '@/lib/hooks/use-admin-stats';

interface Segment {
  key: 'merges' | 'verifications' | 'documents';
  label: string;
  count: number;
  icon: LucideIcon;
  accentBg: string;
  accentText: string;
  barColor: string;
  tab: string;
}

export const ModerationSummaryCard: React.FC = () => {
  const t = useT();
  const router = useRouter();
  const { data, isLoading, isError } = useKpis();

  const merges = data?.moderation.pendingMerges ?? 0;
  const verifs = data?.moderation.pendingVerifications ?? 0;
  const docs = data?.moderation.pendingDocuments ?? 0;
  const total = Math.max(merges + verifs + docs, 1);

  const segments: Segment[] = [
    {
      key: 'merges',
      label: t('admin.dashboard.moderation.merges'),
      count: merges,
      icon: GitMerge,
      accentBg: 'bg-deep-blue/10',
      accentText: 'text-deep-blue',
      barColor: 'bg-deep-blue',
      tab: 'merges',
    },
    {
      key: 'verifications',
      label: t('admin.dashboard.moderation.verifications'),
      count: verifs,
      icon: ShieldCheck,
      accentBg: 'bg-forest/10',
      accentText: 'text-forest',
      barColor: 'bg-forest',
      tab: 'verifications',
    },
    {
      key: 'documents',
      label: t('admin.dashboard.moderation.documents'),
      count: docs,
      icon: FileText,
      accentBg: 'bg-ochre/10',
      accentText: 'text-ochre',
      barColor: 'bg-ochre',
      tab: 'documents',
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-charcoal">
          {t('admin.dashboard.moderation.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {t('admin.dashboard.moderation.error')}
          </div>
        ) : isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : (
          segments.map((seg) => {
            const Icon = seg.icon;
            const pct = Math.round((seg.count / total) * 100);
            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => router.push(`/moderation?tab=${seg.tab}`)}
                className="group block w-full text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded',
                        seg.accentBg,
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', seg.accentText)} aria-hidden />
                    </span>
                    <span className="text-sm font-medium text-charcoal truncate group-hover:text-deep-blue">
                      {seg.label}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-charcoal tabular-nums">
                    {seg.count}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-charcoal/5">
                  <div
                    className={cn('h-full rounded-full transition-all', seg.barColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
