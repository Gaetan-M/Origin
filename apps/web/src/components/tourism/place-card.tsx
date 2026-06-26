'use client';

import { useState } from 'react';
import {
  BadgeCheck,
  Landmark,
  Trees,
  Drama,
  Building2,
  Crown,
  Church,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TourismCategory, TourismPlace } from '@/lib/api/tourism';
import { cn } from '@/lib/utils';
import {
  useCategoryLabel,
  useSourceLabel,
  useTourismT,
  useTourismLocale,
} from './tourism-i18n';

interface PlaceCardProps {
  place: TourismPlace;
}

/** Maps a category to an icon + accent classes. */
function getCategoryMeta(category: TourismCategory): { icon: LucideIcon; accent: string } {
  switch (category) {
    case 'HERITAGE':
      return { icon: Landmark, accent: 'bg-ochre/15 text-ochre' };
    case 'NATURE':
      return { icon: Trees, accent: 'bg-forest/10 text-forest' };
    case 'CULTURE':
      return { icon: Drama, accent: 'bg-terracotta/10 text-terracotta' };
    case 'MUSEUM':
      return { icon: Building2, accent: 'bg-charcoal/5 text-charcoal/60' };
    case 'CHEFFERIE':
      return { icon: Crown, accent: 'bg-ochre/15 text-ochre' };
    case 'RELIGIOUS':
      return { icon: Church, accent: 'bg-forest/10 text-forest' };
    default:
      return { icon: MapPin, accent: 'bg-sand text-charcoal/60' };
  }
}

const DESC_PREVIEW_LIMIT = 240;

/** Builds an external maps URL from geo coords (read-only convenience). */
function mapsHref(lat?: string | null, lng?: string | null): string | null {
  if (!lat || !lng) return null;
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=14/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}`;
}

export function PlaceCard({ place }: PlaceCardProps) {
  const t = useTourismT();
  const categoryLabel = useCategoryLabel();
  const sourceLabel = useSourceLabel();
  const locale = useTourismLocale();
  const [expanded, setExpanded] = useState(false);

  const { icon: CategoryIcon, accent } = getCategoryMeta(place.category);

  const description = place.description ?? '';
  const isLong = description.length > DESC_PREVIEW_LIMIT;
  const shownDescription =
    expanded || !isLong ? description : `${description.slice(0, DESC_PREVIEW_LIMIT).trimEnd()}…`;

  const geoHref = mapsHref(place.latitude, place.longitude);

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  return (
    <article className="overflow-hidden rounded-xl border border-sand bg-white shadow-card">
      {place.mediaUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={place.mediaUrl}
          alt={place.name}
          className="h-40 w-full object-cover"
          loading="lazy"
        />
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              accent,
            )}
          >
            <CategoryIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="min-w-0 text-base font-bold leading-snug text-charcoal">
                {place.name}
              </h2>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                  accent,
                )}
              >
                <CategoryIcon className="h-3 w-3" />
                {categoryLabel(place.category)}
              </span>
            </div>

            {place.region && (
              <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-charcoal/50">
                <MapPin className="h-3 w-3" />
                {place.region}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-charcoal/80">
            {shownDescription}
          </p>
        )}
        {isLong && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-1 text-xs font-semibold text-forest hover:underline"
          >
            {t('readMore')}
          </button>
        )}

        {/* PROVENANCE — always shown. Cited source + verified badge. The line is
            deliberately prominent: official data is a SOURCE, never authority. */}
        <div className="mt-3 rounded-lg border border-sand bg-sand/40 p-2.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-charcoal/70">{t('sourceLabel')}:</span>
            <span className="font-semibold text-forest">{sourceLabel(place.source)}</span>
            {place.verified && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-forest/10 px-1.5 py-0.5 text-[10px] font-semibold text-forest"
                title={t('verified')}
              >
                <BadgeCheck className="h-3 w-3" />
                {t('verified')}
              </span>
            )}
          </div>
          {place.sourceRef && (
            <p className="mt-1 break-words text-[11px] leading-snug text-charcoal/50">
              {place.sourceRef}
            </p>
          )}
          <p className="mt-1 text-[10px] italic leading-snug text-charcoal/40">
            {t('provenanceHint')}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[11px] text-charcoal/40">{formatDate(place.createdAt)}</span>
          {geoHref && (
            <a
              href={geoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {t('viewOnMap')}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
