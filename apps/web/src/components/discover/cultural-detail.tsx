'use client';

import Link from 'next/link';
import {
  ArrowLeft,
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
  AlertCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CulturalContentType } from '@/lib/api/cultural';
import { useCulturalContent } from '@/lib/hooks/use-cultural';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import { EngagementSection } from '@/components/engagement/engagement-section';
import { useContentTypeLabel, useDiscoverT, useDiscoverLocale } from './discover-i18n';
import { RichText } from './rich-text';

/** Maps a content type to an icon + accent classes (mirrors cultural-card). */
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

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-52 w-full rounded-2xl" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export function CulturalDetail({ id }: { id: string | null }) {
  const t = useDiscoverT();
  const typeLabel = useContentTypeLabel();
  const locale = useDiscoverLocale();

  const { data: item, isLoading, isError, refetch } = useCulturalContent(id);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !item) {
    return (
      <div className="space-y-4">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </Link>
        <EmptyState
          icon={AlertCircle}
          title={t('notFound')}
          actionLabel={t('retry')}
          onAction={() => refetch()}
        />
      </div>
    );
  }

  const { icon: TypeIcon, accent } = getTypeMeta(item.contentType);
  const isVerified = item.isFromVerifiedAuthority || (item.authority?.verified ?? false);
  const bylineName = item.authority?.displayName ?? item.author.displayName;
  const imageSrc = item.imageUrl ?? item.mediaUrl ?? null;

  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(item.createdAt));

  return (
    <div className="space-y-5">
      <Link
        href="/discover"
        className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-card">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt={item.title} className="h-52 w-full object-cover sm:h-72" />
        ) : (
          <div className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-forest to-terracotta px-4 text-center sm:h-48">
            <TypeIcon className="h-12 w-12 text-white/85" />
            <span className="line-clamp-2 max-w-md text-base font-semibold text-white/90">
              {item.title}
            </span>
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
              <TypeIcon className="h-3.5 w-3.5" />
              {typeLabel(item.contentType)}
            </span>
            {item.region && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-charcoal/60">
                <MapPin className="h-3.5 w-3.5" />
                {item.region}
              </span>
            )}
            {item.ethnicGroup && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-charcoal/60">
                {item.ethnicGroup}
              </span>
            )}
            {item.languageCode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-charcoal/60">
                {item.languageCode}
              </span>
            )}
            {isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-xs font-semibold text-forest">
                <BadgeCheck className="h-3.5 w-3.5" />
                {t('verified')}
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-bold leading-tight text-charcoal">{item.title}</h1>
          <p className="mt-1 text-xs text-charcoal/40">
            {bylineName ? `${bylineName} · ` : ''}
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Body */}
      {item.body && (
        <section className="rounded-xl border border-sand bg-white p-5">
          <RichText text={item.body} />
        </section>
      )}

      {/* Engagement — reactions, photos, comments, suggest-edit (no rating) */}
      <EngagementSection target="cultural-content" id={item.id} />

      <div className="pt-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/discover">
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
