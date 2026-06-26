'use client';

import { useMemo, useState } from 'react';
import { Compass, AlertCircle } from 'lucide-react';
import type { CulturalContentType } from '@/lib/api/cultural';
import { useDiscoverFeed } from '@/lib/hooks/use-cultural';
import { useEngagementBatch } from '@/lib/hooks/use-engagement';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { CulturalCard } from './cultural-card';
import { ContentTypeFilter } from './content-type-filter';
import { useDiscoverT } from './discover-i18n';

function DiscoverSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-sand bg-white p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/5" />
            </div>
          </div>
          <Skeleton className="mt-3 h-5 w-2/3" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-1.5 h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function DiscoverFeed() {
  const t = useDiscoverT();
  const [contentType, setContentType] = useState<CulturalContentType | null>(null);
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDiscoverFeed(contentType);

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  // Batch-fetch engagement counts for the visible cards so each card shows a
  // subtle "alive" strip without firing its own request.
  const visibleIds = useMemo(() => items.map((i) => i.id), [items]);
  const { data: engagementCounts } = useEngagementBatch('cultural-content', visibleIds);

  return (
    <div className="space-y-3">
      <ContentTypeFilter value={contentType} onChange={setContentType} />

      {isLoading ? (
        <DiscoverSkeleton />
      ) : isError ? (
        <EmptyState
          icon={AlertCircle}
          title={t('error')}
          actionLabel={t('retry')}
          onAction={() => refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={Compass} title={t('empty')} description={t('emptyHint')} />
      ) : (
        <>
          {items.map((item) => (
            <CulturalCard
              key={item.id}
              item={item}
              engagement={engagementCounts?.[item.id]}
            />
          ))}

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? t('loadingMore') : t('loadMore')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
