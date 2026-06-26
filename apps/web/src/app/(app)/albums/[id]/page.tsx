'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useAlbum, useDeleteAlbum } from '@/lib/hooks/use-albums';
import { useCurrentAccount } from '@/lib/hooks/use-auth';
import { AlbumTimeline } from '@/components/albums/album-timeline';
import { AddAlbumItemForm } from '@/components/albums/add-album-item-form';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLmT } from '@/lib/living-memory-i18n';

export default function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useLmT();
  const router = useRouter();
  const { data: album, isLoading } = useAlbum(id);
  const { data: account } = useCurrentAccount();
  const deleteAlbum = useDeleteAlbum();
  const [showAdd, setShowAdd] = useState(false);

  if (isLoading) return <FullPageSpinner />;
  if (!album) return null;

  const canEdit = !!account && account.id === album.ownerAccountId;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={album.title} showBack />

      <div className="-mt-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          {album.subjectPersonName && (
            <p className="text-sm text-charcoal/60">
              {t('albums.about', { name: album.subjectPersonName })}
            </p>
          )}
          {album.description && (
            <p className="text-sm text-charcoal/70">{album.description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
              <ImagePlus className="mr-1.5 h-4 w-4" />
              {t('albums.addPhoto')}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t('common.delete')}
              onClick={() => {
                if (window.confirm(t('albums.deleteAlbumConfirm'))) {
                  deleteAlbum.mutate(album.id, {
                    onSuccess: () => router.push('/albums'),
                  });
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-charcoal/60" />
            </Button>
          </div>
        )}
      </div>

      {canEdit && showAdd && (
        <Card>
          <CardContent className="pt-6">
            <AddAlbumItemForm albumId={album.id} onDone={() => setShowAdd(false)} />
          </CardContent>
        </Card>
      )}

      {album.items.length === 0 ? (
        <EmptyState
          icon={ImagePlus}
          title={t('albums.timeline.empty')}
          description={t('albums.timeline.emptyDesc')}
          actionLabel={canEdit ? t('albums.addPhoto') : undefined}
          onAction={canEdit ? () => setShowAdd(true) : undefined}
        />
      ) : (
        <AlbumTimeline albumId={album.id} items={album.items} canEdit={canEdit} />
      )}
    </div>
  );
}
