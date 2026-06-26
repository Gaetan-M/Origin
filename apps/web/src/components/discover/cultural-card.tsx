'use client';

import { useState } from 'react';
import {
  BadgeCheck,
  Languages,
  ChefHat,
  BookOpen,
  Quote,
  Sparkles,
  Landmark,
  Music,
  Tag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CulturalContentItem, CulturalContentType } from '@/lib/api/cultural';
import { cn } from '@/lib/utils';
import { useContentTypeLabel, useDiscoverT, useDiscoverLocale } from './discover-i18n';

interface CulturalCardProps {
  item: CulturalContentItem;
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
    default:
      return { icon: Tag, accent: 'bg-sand text-charcoal/60' };
  }
}

const BODY_PREVIEW_LIMIT = 280;

export function CulturalCard({ item }: CulturalCardProps) {
  const t = useDiscoverT();
  const typeLabel = useContentTypeLabel();
  const locale = useDiscoverLocale();
  const [expanded, setExpanded] = useState(false);

  const { icon: TypeIcon, accent } = getTypeMeta(item.contentType);
  const isVerified = item.isFromVerifiedAuthority || (item.authority?.verified ?? false);

  // Author label: prefer the public authority display name when present,
  // otherwise the contributing account's display name. Never any private data.
  const bylineName = item.authority?.displayName ?? item.author.displayName;

  const body = item.body ?? '';
  const isLong = body.length > BODY_PREVIEW_LIMIT;
  const shownBody = expanded || !isLong ? body : `${body.slice(0, BODY_PREVIEW_LIMIT).trimEnd()}…`;

  const metaBits = [item.languageCode, item.ethnicGroup, item.region].filter(
    (b): b is string => Boolean(b),
  );

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
      date,
    );
  }

  return (
    <article className="rounded-xl border border-sand bg-white p-4 shadow-card">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            accent,
          )}
        >
          <TypeIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-charcoal">{bylineName}</span>
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
              <span className="text-xs text-charcoal/40">{formatDate(item.createdAt)}</span>
            </div>

            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                accent,
              )}
            >
              <TypeIcon className="h-3 w-3" />
              {typeLabel(item.contentType)}
            </span>
          </div>
        </div>
      </div>

      {/* Title */}
      <h2 className="mt-3 text-base font-bold leading-snug text-charcoal">{item.title}</h2>

      {/* Body */}
      {body && (
        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-charcoal/80">
          {shownBody}
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
    </article>
  );
}
