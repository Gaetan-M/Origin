'use client';

import { Check, ImageIcon, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { mediaAbsoluteUrl } from '@/lib/api/media';
import type { PendingPhoto } from '@/lib/api/moderation';
import { usePendingPhotos, useModeratePhoto } from '@/lib/hooks/use-moderation';
import { useModerationT, useModerationLocale } from './moderation-i18n';

export function PendingPhotos() {
  const t = useModerationT();
  const locale = useModerationLocale();
  const { data, isLoading } = usePendingPhotos();
  const moderate = useModeratePhoto();
  const photos = data ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return <EmptyState icon={ImageIcon} title={t('noPhotos')} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          locale={locale}
          isPending={moderate.isPending && moderate.variables?.id === photo.id}
          onDecide={(decision) => moderate.mutate({ id: photo.id, decision })}
        />
      ))}
    </div>
  );
}

function PhotoCard({
  photo,
  locale,
  isPending,
  onDecide,
}: {
  photo: PendingPhoto;
  locale: string;
  isPending: boolean;
  onDecide: (decision: 'APPROVE' | 'REJECT') => void;
}) {
  const t = useModerationT();
  const isPlace = photo.targetType === 'TOURISM_PLACE';

  return (
    <figure className="flex flex-col overflow-hidden rounded-xl border border-sand bg-white shadow-sm">
      <div className="relative aspect-square w-full bg-sand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaAbsoluteUrl(photo.url)}
          alt={photo.caption ?? t('title')}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <Badge
          variant="secondary"
          className="absolute left-2 top-2 bg-white/90 text-charcoal"
        >
          {isPlace ? t('targetPlace') : t('targetContent')}
        </Badge>
      </div>

      <figcaption className="flex flex-1 flex-col gap-2 p-3">
        {photo.caption && (
          <p className="line-clamp-2 text-sm text-charcoal">{photo.caption}</p>
        )}
        <p className="text-xs text-charcoal/55">
          {t('by')} {photo.authorDisplayName ?? t('unknownAuthor')} ·{' '}
          {new Date(photo.createdAt).toLocaleDateString(locale)}
        </p>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => onDecide('APPROVE')}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t('approve')}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => onDecide('REJECT')}
          >
            <X className="h-4 w-4" />
            {t('reject')}
          </Button>
        </div>
      </figcaption>
    </figure>
  );
}
