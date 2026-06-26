'use client';

import Link from 'next/link';
import {
  BadgeCheck,
  Languages,
  ChefHat,
  BookOpen,
  Quote,
  Sparkles,
  Landmark,
  Music,
  Users,
  Tag,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CulturalContentItem, CulturalContentType } from '@/lib/api/cultural';
import type { EngagementCounts } from '@/lib/api/engagement';
import { cn } from '@/lib/utils';
import { EngagementCountsStrip } from '@/components/engagement/engagement-counts-strip';
import { useContentTypeLabel, useDiscoverT, useDiscoverLocale } from './discover-i18n';
import { RichText } from './rich-text';

interface CulturalCardProps {
  item: CulturalContentItem;
  /** Compact engagement counts shown as an "alive" strip (fetched in batch). */
  engagement?: EngagementCounts;
}

/** Maps a content type to an icon + accent classes. */
function getTypeMeta(type: CulturalContentType): { icon: LucideIcon; accent: string } {
  switch (type) {
    case 'LANGUAGE':
      return { icon: Languages, accent: 'bg-forest/10 text-forest' };
    case 'RECIPE':
      return { icon: ChefHat, accent: 'bg-ochre/15 text-ochre' };
    case 'TALE':
      return { icon: BookOpen, accent: 'bg-terracotta/10 text-terracotta' };
    case 'PROVERB':
      return { icon: Quote, accent: 'bg-forest/10 text-forest' };
    case 'RITE':
      return { icon: Sparkles, accent: 'bg-ochre/15 text-ochre' };
    case 'CUSTOM':
      return { icon: Landmark, accent: 'bg-charcoal/5 text-charcoal/60' };
    case 'MUSIC':
      return { icon: Music, accent: 'bg-terracotta/10 text-terracotta' };
    case 'PEOPLE':
      return { icon: Users, accent: 'bg-forest/10 text-forest' };
    default:
      return { icon: Tag, accent: 'bg-sand text-charcoal/60' };
  }
}

export function CulturalCard({ item, engagement }: CulturalCardProps) {
  const t = useDiscoverT();
  const typeLabel = useContentTypeLabel();
  const locale = useDiscoverLocale();

  const { icon: TypeIcon, accent } = getTypeMeta(item.contentType);
  const isVerified = item.isFromVerifiedAuthority || (item.authority?.verified ?? false);

  // Author label: prefer the public authority display name when present,
  // otherwise the contributing account's display name. Never any private data.
  const bylineName = item.authority?.displayName ?? item.author.displayName;

  // Prefer the external image; fall back to any resolved media URL.
  const imageSrc = item.imageUrl ?? item.mediaUrl ?? null;

  const body = item.body ?? '';
  const metaBits = [item.languageCode, item.ethnicGroup, item.region].filter(
    (b): b is string => Boolean(b),
  );

  function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  }

  return (
    <Link
      href={`/discover/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-sand bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
    >
      {/* Postcard hero — a REAL photo when one exists, otherwise a clean
          on-brand placeholder (NEVER a random/unrelated image). */}
      <div className="relative h-44 w-full overflow-hidden bg-sand">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-forest to-terracotta px-4 text-center">
            <TypeIcon className="h-9 w-9 text-white/85" />
            <span className="line-clamp-2 text-sm font-semibold text-white/90">{item.title}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <span
          className={cn(
            'absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm',
            accent,
          )}
        >
          <TypeIcon className="h-3 w-3" />
          {typeLabel(item.contentType)}
        </span>
        {item.region && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-xs font-bold text-white drop-shadow">
            <MapPin className="h-3 w-3" />
            {item.region}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Byline + verified + date */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {bylineName && (
              <span className="truncate text-sm font-semibold text-charcoal">{bylineName}</span>
            )}
            {isVerified && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-forest/10 px-1.5 py-0.5 text-[10px] font-semibold text-forest"
                title={t('verifiedAuthority')}
              >
                <BadgeCheck className="h-3 w-3" />
                {t('verified')}
              </span>
            )}
          </div>
          <span className="shrink-0 text-xs text-charcoal/40">{formatDate(item.createdAt)}</span>
        </div>

        {/* Title */}
        <h2 className="mt-1.5 text-base font-bold leading-snug text-charcoal">{item.title}</h2>

        {/* Body preview — readable, with bold section headers. */}
        {body && <RichText text={body} maxLines={3} className="mt-2" />}

        {/* Meta facets */}
        {metaBits.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {metaBits.map((bit) => (
              <span
                key={bit}
                className="inline-flex items-center rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-charcoal/60"
              >
                {bit}
              </span>
            ))}
          </div>
        )}

        {/* Engagement "alive" strip */}
        <EngagementCountsStrip counts={engagement} className="mt-2.5" />

        {/* Footer affordance */}
        <div className="mt-3 flex items-center justify-end border-t border-sand pt-2.5">
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-forest">
            {t('readMore')}
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
