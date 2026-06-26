'use client';

import { useState } from 'react';
import { MapPinned, AlertCircle } from 'lucide-react';
import type { TourismCategory } from '@/lib/api/tourism';
import { TOURISM_CATEGORIES } from '@/lib/api/tourism';
import { useTourismPlaces } from '@/lib/hooks/use-tourism';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import { PlaceCard } from './place-card';
import { useCategoryLabel, useTourismT } from './tourism-i18n';

function PlaceListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-sand bg-white p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-1.5 h-4 w-4/5" />
          <Skeleton className="mt-3 h-12 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        active
          ? 'border-forest bg-forest text-white'
          : 'border-sand bg-white text-charcoal/70 hover:bg-sand',
      )}
    >
      {label}
    </button>
  );
}

export function PlaceList() {
  const t = useTourismT();
  const categoryLabel = useCategoryLabel();

  const [category, setCategory] = useState<TourismCategory | null>(null);
  const [regionInput, setRegionInput] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const region = regionInput.trim() || null;

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTourismPlaces({ region, category, verifiedOnly });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={regionInput}
            onChange={(e) => setRegionInput(e.target.value)}
            placeholder={t('filterAllRegions')}
            className="sm:max-w-xs"
          />
          <label className="inline-flex shrink-0 items-center gap-2 text-sm text-charcoal/70">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-sand text-forest focus:ring-forest"
            />
            {t('verifiedOnly')}
          </label>
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryChip
            active={category === null}
            onClick={() => setCategory(null)}
            label={t('filterAllCategories')}
          />
          {TOURISM_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              active={category === cat}
              onClick={() => setCategory(cat)}
              label={categoryLabel(cat)}
            />
          ))}
        </div>
      </div>

      {isLoading ? (
        <PlaceListSkeleton />
      ) : isError ? (
        <EmptyState
          icon={AlertCircle}
          title={t('error')}
          actionLabel={t('retry')}
          onAction={() => refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={MapPinned} title={t('empty')} description={t('emptyHint')} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>

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
