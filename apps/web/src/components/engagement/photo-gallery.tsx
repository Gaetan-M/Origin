'use client';

import { useRef } from 'react';
import { Camera, Loader2, ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAddPhoto, usePhotos } from '@/lib/hooks/use-engagement';
import type { EngagementTarget } from '@/lib/api/engagement';
import { ApiError } from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useEngagementT } from './engagement-i18n';

interface PhotoGalleryProps {
  target: EngagementTarget;
  id: string;
}

const ACCEPTED = 'image/jpeg,image/png,image/webp';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export function PhotoGallery({ target, id }: PhotoGalleryProps) {
  const t = useEngagementT();
  const { data, isLoading } = usePhotos(target, id);
  const addPhoto = useAddPhoto(target, id);
  const inputRef = useRef<HTMLInputElement>(null);

  const photos = data?.items ?? [];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so the same file can be re-picked after an error.
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_SIZE) {
      toast.error(t('photoTooLarge'));
      return;
    }

    addPhoto.mutate(
      { file },
      {
        onSuccess: () => toast.success(t('photoSent')),
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : undefined;
          toast.error(msg ?? t('photoError'));
        },
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-charcoal/50">
          {t('photosTitle')}
          {photos.length > 0 && (
            <span className="ml-1.5 text-charcoal/40">({photos.length})</span>
          )}
        </h3>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={addPhoto.isPending}
        >
          {addPhoto.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('uploading')}
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              {t('addPhoto')}
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      ) : photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-sand bg-sand"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption ?? photo.authorDisplayName}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {photo.caption && (
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-medium text-white">
                  <span className="line-clamp-2">{photo.caption}</span>
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-sand bg-sand/40 py-6 text-center">
          <ImageOff className="h-6 w-6 text-charcoal/30" />
          <p className="text-xs text-charcoal/50">{t('noPhotos')}</p>
        </div>
      )}
    </div>
  );
}
