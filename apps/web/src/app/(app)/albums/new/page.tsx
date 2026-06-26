'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { CreateAlbumForm } from '@/components/albums/create-album-form';
import { useLmT } from '@/lib/living-memory-i18n';

function NewAlbumContent() {
  const t = useLmT();
  const searchParams = useSearchParams();
  // Optional ?subject=<personId> pre-binds the album to a person (e.g. opened
  // from that person's profile).
  const subjectPersonId = searchParams.get('subject') ?? undefined;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title={t('albums.create')} showBack />
      <Card>
        <CardContent className="pt-6">
          <CreateAlbumForm subjectPersonId={subjectPersonId} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewAlbumPage() {
  return (
    <Suspense>
      <NewAlbumContent />
    </Suspense>
  );
}
