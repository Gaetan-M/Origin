'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPinned,
  AlertCircle,
  Search,
  Map as MapIcon,
  List as ListIcon,
  X,
} from 'lucide-react';
import type { TourismCategory, TourismPlace } from '@/lib/api/tourism';
import { TOURISM_CATEGORIES } from '@/lib/api/tourism';
import { useTourismPlaces } from '@/lib/hooks/use-tourism';
import { useEngagementBatch } from '@/lib/hooks/use-engagement';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import { PlaceCard } from './place-card';
import { TourismMapFrame } from './tourism-map-frame';
import { getCategoryMeta, toLatLng, CAMEROON_REGIONS } from './tourism-meta';
import { useCategoryLabel, useTourismT } from './tourism-i18n';

type ViewMode = 'list' | 'map';
const ALL_REGIONS = '__all__';

function PlaceListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-sand bg-white">
          <Skeleton className="h-20 w-full" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  dotColor,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dotColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        active
          ? 'border-forest bg-forest text-white'
          : 'border-sand bg-white text-charcoal/70 hover:bg-sand',
      )}
    >
      {dotColor && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: active ? '#ffffff' : dotColor }}
        />
      )}
      {label}
    </button>
  );
}

export function PlaceList() {
  const t = useTourismT();
  const categoryLabel = useCategoryLabel();
  const router = useRouter();

  const [view, setView] = useState<ViewMode>('list');
  const [category, setCategory] = useState<TourismCategory | null>(null);
  const [region, setRegion] = useState<string>(ALL_REGIONS);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [search, setSearch] = useState('');

  const apiRegion = region === ALL_REGIONS ? null : region;

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTourismPlaces({ region: apiRegion, category, verifiedOnly });

  const allItems = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  // Free-text search is applied client-side over loaded pages (name / region /
  // description) so typing feels instant and offline-friendly.
  const items = useMemo<TourismPlace[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((p) =>
      [p.name, p.region, p.description]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q)),
    );
  }, [allItems, search]);

  const geoCount = useMemo(
    () => items.filter((p) => toLatLng(p.latitude, p.longitude)).length,
    [items],
  );

  // Batch-fetch engagement counts for the visible cards so each card shows a
  // subtle "alive" strip without firing its own request.
  const visibleIds = useMemo(() => items.map((p) => p.id), [items]);
  const { data: engagementCounts } = useEngagementBatch('tourism-place', visibleIds);

  const hasActiveFilters =
    category !== null || apiRegion !== null || verifiedOnly || search.trim() !== '';

  function clearFilters() {
    setCategory(null);
    setRegion(ALL_REGIONS);
    setVerifiedOnly(false);
    setSearch('');
  }

  return (
    <div className="space-y-3">
      {/* Search + region + view toggle */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder={t('filterAllRegions')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_REGIONS}>{t('filterAllRegions')}</SelectItem>
            {CAMEROON_REGIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="inline-flex shrink-0 rounded-md border border-sand bg-white p-0.5">
          <button
            type="button"
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors',
              view === 'list' ? 'bg-forest text-white' : 'text-charcoal/60 hover:bg-sand',
            )}
          >
            <ListIcon className="h-4 w-4" />
            {t('tabList')}
          </button>
          <button
            type="button"
            onClick={() => setView('map')}
            aria-pressed={view === 'map'}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors',
              view === 'map' ? 'bg-forest text-white' : 'text-charcoal/60 hover:bg-sand',
            )}
          >
            <MapIcon className="h-4 w-4" />
            {t('tabMap')}
          </button>
        </div>
      </div>

      {/* Category chips */}
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
            dotColor={getCategoryMeta(cat).pin}
          />
        ))}
      </div>

      {/* Result meta row */}
      {!isLoading && !isError && (
        <div className="flex items-center justify-between gap-2 text-xs text-charcoal/50">
          <span>
            {items.length} {t('resultsCount')}
            {view === 'map' && geoCount !== items.length
              ? ` · ${geoCount} ${t('onMap')}`
              : ''}
          </span>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-charcoal/70">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="h-4 w-4 rounded border-sand text-forest focus:ring-forest"
              />
              {t('verifiedOnly')}
            </label>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 font-semibold text-forest hover:underline"
              >
                <X className="h-3 w-3" />
                {t('clearFilters')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
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
        <EmptyState
          icon={MapPinned}
          title={hasActiveFilters ? t('noResults') : t('empty')}
          description={hasActiveFilters ? t('noResultsHint') : t('emptyHint')}
          actionLabel={hasActiveFilters ? t('clearFilters') : undefined}
          onAction={hasActiveFilters ? clearFilters : undefined}
        />
      ) : view === 'map' ? (
        geoCount === 0 ? (
          <EmptyState
            icon={MapPinned}
            title={t('mapNoGeo')}
            description={t('mapNoGeoHint')}
            actionLabel={t('tabList')}
            onAction={() => setView('list')}
          />
        ) : (
          <TourismMapFrame
            places={items}
            onSelect={(place) => router.push(`/tourism/${place.id}`)}
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                engagement={engagementCounts?.[place.id]}
              />
            ))}
          </div>

          {hasNextPage && !search.trim() && (
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
