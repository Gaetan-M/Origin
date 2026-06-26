'use client';

import Link from 'next/link';
import { BadgeCheck, MapPin, Navigation, ChevronRight } from 'lucide-react';
import type { TourismPlace } from '@/lib/api/tourism';
import { cn } from '@/lib/utils';
import { getCategoryMeta, directionsHref } from './tourism-meta';
import {
  useCategoryLabel,
  useSourceLabel,
  useTourismT,
  useTourismLocale,
} from './tourism-i18n';

interface PlaceCardProps {
  place: TourismPlace;
  /** Highlight when this card is the one hovered/selected on the map. */
  active?: boolean;
}

const DESC_PREVIEW_LIMIT = 160;

export function PlaceCard({ place, active = false }: PlaceCardProps) {
  const t = useTourismT();
  const categoryLabel = useCategoryLabel();
  const sourceLabel = useSourceLabel();
  const locale = useTourismLocale();

  const { icon: CategoryIcon, accent } = getCategoryMeta(place.category);

  const description = place.description ?? '';
  const preview =
    description.length > DESC_PREVIEW_LIMIT
      ? `${description.slice(0, DESC_PREVIEW_LIMIT).trimEnd()}…`
      : description;

  const directions = directionsHref(place.latitude, place.longitude);

  function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  }

  function openDirections(e: React.MouseEvent) {
    // The card is a Link; the directions button must not navigate to detail.
    e.preventDefault();
    e.stopPropagation();
    if (directions) window.open(directions, '_blank', 'noopener,noreferrer');
  }

  return (
    <Link
      href={`/tourism/${place.id}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest',
        active ? 'border-forest ring-2 ring-forest/30' : 'border-sand',
      )}
    >
      {/* Postcard hero — always an image (real photo when available, tasteful
          deterministic fallback otherwise) with category + region overlay. */}
      <div className="relative h-44 w-full overflow-hidden bg-sand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            place.imageUrl ??
            place.mediaUrl ??
            `https://picsum.photos/seed/origin-${place.id}/640/420`
          }
          alt={place.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <span
          className={cn(
            'absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm',
            accent,
          )}
        >
          <CategoryIcon className="h-3 w-3" />
          {categoryLabel(place.category)}
        </span>
        {place.region && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-xs font-bold text-white drop-shadow">
            <MapPin className="h-3 w-3" />
            {place.region}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Header: title + category chip */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 text-base font-bold leading-snug text-charcoal">
            {place.name}
          </h2>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              accent,
            )}
          >
            <CategoryIcon className="h-3 w-3" />
            {categoryLabel(place.category)}
          </span>
        </div>

        {/* Region chip + verified */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {place.region && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-charcoal/60">
              <MapPin className="h-3 w-3" />
              {place.region}
            </span>
          )}
          {place.verified && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-forest/10 px-1.5 py-0.5 text-[10px] font-semibold text-forest">
              <BadgeCheck className="h-3 w-3" />
              {t('verified')}
            </span>
          )}
        </div>

        {/* Description preview */}
        {preview && (
          <p className="mt-2.5 text-sm leading-relaxed text-charcoal/75">{preview}</p>
        )}

        {/* PROVENANCE — official data is a SOURCE, never authority. */}
        <p className="mt-2.5 text-xs text-charcoal/55">
          <span className="font-semibold text-charcoal/70">{t('sourceLabel')}: </span>
          <span className="font-semibold text-forest">{sourceLabel(place.source)}</span>
          {place.sourceRef && (
            <span className="text-charcoal/45"> — {place.sourceRef}</span>
          )}
        </p>

        {/* Footer: date + actions */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-sand pt-2.5">
          <span className="text-[11px] text-charcoal/40">{formatDate(place.createdAt)}</span>
          <div className="flex items-center gap-3">
            {directions && (
              <button
                type="button"
                onClick={openDirections}
                className="inline-flex items-center gap-1 text-xs font-semibold text-terracotta hover:underline"
              >
                <Navigation className="h-3.5 w-3.5" />
                {t('directions')}
              </button>
            )}
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-forest">
              {t('readMore')}
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
