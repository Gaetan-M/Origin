'use client';

import { useRouter } from 'next/navigation';
import { Images } from 'lucide-react';
import { useMyAlbums } from '@/lib/hooks/use-albums';
import { AlbumGrid } from '@/components/albums/album-grid';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import { useLmT } from '@/lib/living-memory-i18n';

export default function AlbumsPage() {
  const t = useLmT();
  const router = useRouter();
  const { data: albums, isLoading } = useMyAlbums();

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t('albums.title')}
        action={{ label: t('albums.create'), onClick: () => router.push('/albums/new') }}
      />
      <p className="-mt-4 text-sm text-charcoal/55">{t('albums.subtitle')}</p>

      {!albums || albums.length === 0 ? (
        <EmptyState
          icon={Images}
          title={t('albums.emptyTitle')}
          description={t('albums.emptyDesc')}
          actionLabel={t('albums.create')}
          onAction={() => router.push('/albums/new')}
        />
      ) : (
        <AlbumGrid albums={albums} />
      )}
    </div>
  );
}
