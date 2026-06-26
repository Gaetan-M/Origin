'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Images } from 'lucide-react';
import type { Album } from '@/lib/api/albums';
import { getMediaFileUrl } from '@/lib/api/media';
import { Badge } from '@/components/ui/badge';
import { useLmT } from '@/lib/living-memory-i18n';

interface AlbumGridProps {
  albums: Album[];
}

export function AlbumGrid({ albums }: AlbumGridProps) {
  const t = useLmT();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {albums.map((album) => (
        <Link
          key={album.id}
          href={`/albums/${album.id}`}
          className="group overflow-hidden rounded-xl border bg-white shadow-card transition-shadow hover:shadow-lg"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand">
            {album.coverMediaId ? (
              <Image
                src={getMediaFileUrl(album.coverMediaId)}
                alt={album.title}
                fill
                unoptimized
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Images className="h-10 w-10 text-charcoal/25" />
              </div>
            )}
            <Badge
              variant="secondary"
              className="absolute left-2 top-2 bg-white/85 text-charcoal"
            >
              {t(`albums.kind.${album.kind}`)}
            </Badge>
          </div>

          <div className="space-y-1 p-4">
            <h3 className="truncate font-semibold text-charcoal">{album.title}</h3>
            {album.subjectPersonName && (
              <p className="truncate text-xs text-charcoal/55">
                {t('albums.about', { name: album.subjectPersonName })}
              </p>
            )}
            <p className="text-xs text-charcoal/45">
              {t('albums.itemCount', { count: album.itemCount })}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
