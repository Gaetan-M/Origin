'use client';

import { useParams } from 'next/navigation';
import { CulturalDetail } from '@/components/discover/cultural-detail';

export default function DiscoverDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      <CulturalDetail id={id} />
    </div>
  );
}
