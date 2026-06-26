'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import type TourismMap from './tourism-map';

/**
 * SSR-safe wrapper around the Leaflet map. Leaflet reads `window` at import
 * time, so the real map is only loaded in the browser; until then we show a
 * branded placeholder of the same height to avoid layout shift.
 */
const LazyMap = dynamic(() => import('./tourism-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] min-h-[360px] items-center justify-center rounded-xl border border-sand bg-sand/40">
      <Loader2 className="h-6 w-6 animate-spin text-forest" />
    </div>
  ),
});

export function TourismMapFrame(props: ComponentProps<typeof TourismMap>) {
  return <LazyMap {...props} />;
}
