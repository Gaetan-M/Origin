'use client';

import { Newspaper, AlertCircle } from 'lucide-react';
import { useFamilyFeed } from '@/lib/hooks/use-family-feed';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { FeedPostCard } from './feed-post-card';
import { useFeedT } from './feed-i18n';

function FeedSkeleton() {
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
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function FeedList() {
  const t = useFeedT();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFamilyFeed();

  if (isLoading) return <FeedSkeleton />;

  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t('error')}
        actionLabel={t('retry')}
        onAction={() => refetch()}
      />
    );
  }

  const posts = data?.pages.flatMap((p) => p.items) ?? [];

  if (posts.length === 0) {
    return <EmptyState icon={Newspaper} title={t('empty')} description={t('emptyHint')} />;
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <FeedPostCard key={post.id} post={post} />
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
    </div>
  );
}
