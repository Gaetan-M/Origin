'use client';

import { useParams } from 'next/navigation';
import { PlaceDetail } from '@/components/tourism/place-detail';

export default function TourismPlacePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      <PlaceDetail id={id} />
    </div>
  );
}
