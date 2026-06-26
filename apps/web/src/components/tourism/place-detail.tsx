'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import type { TourismPlace } from '@/lib/api/tourism';
import { useTourismPlace, useTourismPlaces } from '@/lib/hooks/use-tourism';
import { useMyStats } from '@/lib/hooks/use-stats';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import { PlaceCard } from './place-card';
import { TourismMapFrame } from './tourism-map-frame';
import { getCategoryMeta, toLatLng, directionsHref } from './tourism-meta';
import {
  useCategoryLabel,
  useSourceLabel,
  useTourismT,
  useTourismLocale,
} from './tourism-i18n';

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export function PlaceDetail({ id }: { id: string | null }) {
  const t = useTourismT();
  const categoryLabel = useCategoryLabel();
  const sourceLabel = useSourceLabel();
  const locale = useTourismLocale();

  const { data: place, isLoading, isError, refetch } = useTourismPlace(id ?? undefined);

  // Nearby = other places in the same region (strong, always-available signal).
  const { data: regionData } = useTourismPlaces({ region: place?.region ?? null });
  // Broad pull used to surface village-of-origin affinity.
  const { data: broadData } = useTourismPlaces({});
  const { data: stats } = useMyStats();

  const point = place ? toLatLng(place.latitude, place.longitude) : null;
  const directions = place ? directionsHref(place.latitude, place.longitude) : null;

  const nearby = useMemo<TourismPlace[]>(() => {
    if (!place?.region) return [];
    const items = regionData?.pages.flatMap((p) => p.items) ?? [];
    return items.filter((p) => p.id !== place.id).slice(0, 4);
  }, [regionData, place]);

  // Affinity: places whose region/name/description echoes the user's most
  // documented village of origin. A warm, personal nudge — never private data.
  const affinity = useMemo<TourismPlace[]>(() => {
    const village = stats?.topVillages?.[0]?.village?.trim().toLowerCase();
    if (!village || village.length < 3 || !place) return [];
    const items = broadData?.pages.flatMap((p) => p.items) ?? [];
    return items
      .filter((p) => p.id !== place.id)
      .filter((p) =>
        [p.region, p.name, p.description]
          .filter(Boolean)
          .some((f) => (f as string).toLowerCase().includes(village)),
      )
      .slice(0, 4);
  }, [broadData, stats, place]);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !place) {
    return (
      <div className="space-y-4">
        <Link
          href="/tourism"
          className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToList')}
        </Link>
        <EmptyState
          icon={AlertCircle}
          title={t('detailNotFound')}
          description={t('detailNotFoundHint')}
          actionLabel={t('retry')}
          onAction={() => refetch()}
        />
      </div>
    );
  }

  const { icon: CategoryIcon, accent } = getCategoryMeta(place.category);

  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(place.createdAt));

  return (
    <div className="space-y-5">
      <Link
        href="/tourism"
        className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToList')}
      </Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-card">
        {place.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.mediaUrl}
            alt={place.name}
            className="h-52 w-full object-cover sm:h-64"
          />
        ) : (
          <div
            className={cn(
              'flex h-32 items-center justify-center sm:h-40',
              accent.split(' ')[0],
            )}
          >
            <CategoryIcon className={cn('h-12 w-12 opacity-70', accent.split(' ')[1])} />
          </div>
        )}

        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                accent,
              )}
            >
              <CategoryIcon className="h-3.5 w-3.5" />
              {categoryLabel(place.category)}
            </span>
            {place.region && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-charcoal/60">
                <MapPin className="h-3.5 w-3.5" />
                {place.region}
              </span>
            )}
            {place.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-xs font-semibold text-forest">
                <BadgeCheck className="h-3.5 w-3.5" />
                {t('verified')}
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-bold leading-tight text-charcoal">
            {place.name}
          </h1>
          <p className="mt-1 text-xs text-charcoal/40">
            {t('addedOn')} {formattedDate}
          </p>

          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-terracotta px-4 py-2 text-sm font-semibold text-white shadow-card transition-colors hover:bg-terracotta-dark"
            >
              <Navigation className="h-4 w-4" />
              {t('directions')}
            </a>
          )}
        </div>
      </div>

      {/* About */}
      {place.description && (
        <section className="rounded-xl border border-sand bg-white p-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-charcoal/50">
            {t('aboutLabel')}
          </h2>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-charcoal/80">
            {place.description}
          </p>
        </section>
      )}

      {/* Mini-map */}
      {point && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal/50">
            {t('locationLabel')}
          </h2>
          <TourismMapFrame
            places={[place]}
            center={point}
            zoom={12}
            interactive
            heightClassName="h-56"
          />
          <p className="text-xs text-charcoal/40">
            {point[0].toFixed(4)}, {point[1].toFixed(4)}
          </p>
        </section>
      )}

      {/* Provenance — official data is a cited SOURCE, never authority. */}
      <section className="rounded-xl border border-forest/20 bg-forest/5 p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-charcoal/80">
              {t('sourceLabel')}:{' '}
              <span className="text-forest">{sourceLabel(place.source)}</span>
            </p>
            {place.sourceRef && (
              <p className="mt-1 break-words text-xs text-charcoal/60">{place.sourceRef}</p>
            )}
            <p className="mt-2 text-[11px] italic text-charcoal/50">
              {t('independenceNote')}
            </p>
          </div>
        </div>
      </section>

      {/* Affinity — places near the user's village of origin */}
      {affinity.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-ochre" />
            <h2 className="text-base font-bold text-charcoal">{t('affinityTitle')}</h2>
          </div>
          <p className="-mt-1 text-xs text-charcoal/50">{t('affinitySubtitle')}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {affinity.map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
        </section>
      )}

      {/* Same region */}
      {nearby.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-charcoal">{t('nearbyTitle')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {nearby.map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
        </section>
      )}

      <div className="pt-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/tourism">
            <ArrowLeft className="h-4 w-4" />
            {t('backToList')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
