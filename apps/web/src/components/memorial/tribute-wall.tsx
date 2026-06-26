'use client';

import Image from 'next/image';
import { Flame, MessageSquareHeart, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MemorialTribute } from '@/lib/api/memorial';
import { getMediaFileUrl } from '@/lib/api/media';
import { useDeleteTribute } from '@/lib/hooks/use-memorial';
import { useLmT } from '@/lib/living-memory-i18n';
import { useUiStore } from '@/stores/ui-store';
import { EmptyState } from '@/components/shared/empty-state';

interface TributeWallProps {
  personId: string;
  tributes: MemorialTribute[];
  /** Account id of the viewer, used to allow deleting one's own tributes. */
  currentAccountId?: string | null;
}

function formatWhen(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function TributeWall({ personId, tributes, currentAccountId }: TributeWallProps) {
  const t = useLmT();
  const locale = useUiStore((s) => s.locale);
  const deleteTribute = useDeleteTribute(personId);

  if (tributes.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareHeart}
        title={t('memorial.wall.title')}
        description={t('memorial.wall.empty')}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-lg text-charcoal">{t('memorial.wall.title')}</h3>
      <ul className="space-y-3">
        {tributes.map((tribute) => {
          const author = tribute.authorDisplayName ?? t('common.someone');
          const canDelete =
            !!currentAccountId && currentAccountId === tribute.authorAccountId;
          return (
            <li
              key={tribute.id}
              className={cn(
                'group relative rounded-xl border p-4 shadow-card',
                // sober, dove/sepia treatment for the deceased's memorial
                'border-sand-dark/60 bg-[#faf7f2]',
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    tribute.kind === 'CANDLE'
                      ? 'bg-ochre/15 text-ochre-dark'
                      : 'bg-forest/10 text-forest',
                  )}
                >
                  {tribute.kind === 'CANDLE' ? (
                    <Flame className="h-4 w-4" />
                  ) : (
                    <MessageSquareHeart className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-charcoal/80">
                    <span className="font-semibold text-charcoal">{author}</span>{' '}
                    {t(`memorial.kind.${tribute.kind}`)}
                  </p>
                  <p className="text-xs text-charcoal/45">
                    {formatWhen(tribute.createdAt, locale)}
                  </p>

                  {tribute.message && (
                    <p className="mt-2 whitespace-pre-line text-sm italic text-charcoal/75">
                      “{tribute.message}”
                    </p>
                  )}

                  {tribute.mediaId && tribute.kind === 'PHOTO' && (
                    <div className="relative mt-3 aspect-[4/3] w-full max-w-sm overflow-hidden rounded-lg bg-sand">
                      <Image
                        src={getMediaFileUrl(tribute.mediaId)}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                        style={{ filter: 'sepia(0.15)' }}
                      />
                    </div>
                  )}

                  {tribute.mediaId && tribute.kind === 'VIDEO' && (
                    <video
                      src={getMediaFileUrl(tribute.mediaId)}
                      controls
                      className="mt-3 max-h-72 w-full max-w-sm rounded-lg"
                    />
                  )}
                </div>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t('memorial.deleteConfirm'))) {
                        deleteTribute.mutate(tribute.id);
                      }
                    }}
                    className="rounded-full p-1.5 text-charcoal/40 opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
