'use client';

import Image from 'next/image';
import { Trash2 } from 'lucide-react';
import type { AlbumItem } from '@/lib/api/albums';
import { getMediaFileUrl } from '@/lib/api/media';
import { useDeleteAlbumItem } from '@/lib/hooks/use-albums';
import { useLmT } from '@/lib/living-memory-i18n';
import { useUiStore } from '@/stores/ui-store';

interface AlbumTimelineProps {
  albumId: string;
  items: AlbumItem[];
  canEdit?: boolean;
}

/** Sort chronologically: known takenAt first (ascending), then by position. */
function sortItems(items: AlbumItem[]): AlbumItem[] {
  return [...items].sort((a, b) => {
    if (a.takenAt && b.takenAt) return a.takenAt.localeCompare(b.takenAt);
    if (a.takenAt) return -1;
    if (b.takenAt) return 1;
    return a.position - b.position;
  });
}

function formatTaken(item: AlbumItem, locale: string, undatedLabel: string): string {
  if (item.takenAtText) return item.takenAtText;
  if (item.takenAt) {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(item.takenAt));
  }
  return undatedLabel;
}

export function AlbumTimeline({ albumId, items, canEdit }: AlbumTimelineProps) {
  const t = useLmT();
  const locale = useUiStore((s) => s.locale);
  const deleteItem = useDeleteAlbumItem(albumId);

  const ordered = sortItems(items);

  return (
    <ol className="relative ml-3 space-y-8 border-l-2 border-sand-dark pl-6">
      {ordered.map((item) => (
        <li key={item.id} className="relative">
          <span
            className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-forest shadow"
            aria-hidden
          />
          <p className="mb-2 text-sm font-semibold text-forest">
            {formatTaken(item, locale, t('albums.timeline.undated'))}
          </p>

          <figure className="group overflow-hidden rounded-xl border bg-white shadow-card">
            <div className="relative aspect-[4/3] w-full bg-sand">
              <Image
                src={getMediaFileUrl(item.mediaId)}
                alt={item.caption ?? ''}
                fill
                unoptimized
                className="object-cover"
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('albums.deleteConfirm'))) {
                      deleteItem.mutate(item.id);
                    }
                  }}
                  className="absolute right-2 top-2 rounded-full bg-white/85 p-2 text-charcoal/70 opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {item.caption && (
              <figcaption className="px-4 py-3 text-sm text-charcoal/75">
                {item.caption}
              </figcaption>
            )}
          </figure>
        </li>
      ))}
    </ol>
  );
}
