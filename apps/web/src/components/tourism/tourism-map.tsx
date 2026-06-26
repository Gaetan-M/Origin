'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { TourismPlace } from '@/lib/api/tourism';
import {
  CAMEROON_CENTER,
  CAMEROON_DEFAULT_ZOOM,
  getCategoryMeta,
  toLatLng,
} from './tourism-meta';
import { useCategoryLabel, useTourismT } from './tourism-i18n';

/**
 * Interactive Leaflet map of Cameroon with a coloured pin per geolocated place.
 * Uses OpenStreetMap tiles (no API key). Rendered client-side only — consumers
 * must load it via `next/dynamic(..., { ssr: false })` because Leaflet touches
 * `window` at import time.
 */

export interface TourismMapPoint {
  place: TourismPlace;
  position: [number, number];
}

interface TourismMapProps {
  places: TourismPlace[];
  /** Called when a popup "open" action is clicked. */
  onSelect?: (place: TourismPlace) => void;
  selectedId?: string | null;
  /** Tailwind height class for the map frame. */
  heightClassName?: string;
  /** Override the initial centre/zoom (e.g. focus a single place). */
  center?: [number, number];
  zoom?: number;
  /** When false the map is a static preview (mini-map on the detail page). */
  interactive?: boolean;
  /** Auto-fit the viewport to all pins (ignored when `center` is provided). */
  fitToPoints?: boolean;
}

/** Builds a teardrop SVG marker tinted with the category colour. */
function buildIcon(color: string, active: boolean): L.DivIcon {
  const scale = active ? 1.18 : 1;
  const w = Math.round(30 * scale);
  const h = Math.round(40 * scale);
  const ring = active ? '<circle cx="15" cy="14" r="12" fill="none" stroke="#1A1A1A" stroke-opacity="0.25" stroke-width="1.5"/>' : '';
  const html = `
    <div style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));transform:translate(-50%,-100%)">
      <svg width="${w}" height="${h}" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 13.2 23.6 13.8 24.2a1.7 1.7 0 0 0 2.4 0C16.8 38.6 30 25.5 30 15 30 6.7 23.3 0 15 0Z" fill="${color}"/>
        <circle cx="15" cy="14" r="6.5" fill="#ffffff"/>
        ${ring}
      </svg>
    </div>`;
  return L.divIcon({
    html,
    className: 'tourism-pin',
    iconSize: [w, h],
    iconAnchor: [0, 0],
    popupAnchor: [0, -h + 4],
  });
}

/** Imperatively fit the map to the supplied points once they are known. */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  // Serialise the points so the effect only re-runs when the set truly changes.
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 11);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export default function TourismMap({
  places,
  onSelect,
  selectedId,
  heightClassName = 'h-[60vh] min-h-[360px]',
  center,
  zoom,
  interactive = true,
  fitToPoints = true,
}: TourismMapProps) {
  const t = useTourismT();
  const categoryLabel = useCategoryLabel();

  const points = useMemo<TourismMapPoint[]>(() => {
    return places
      .map((place) => {
        const position = toLatLng(place.latitude, place.longitude);
        return position ? { place, position } : null;
      })
      .filter((p): p is TourismMapPoint => p !== null);
  }, [places]);

  const positions = useMemo(() => points.map((p) => p.position), [points]);

  return (
    <div className={`overflow-hidden rounded-xl border border-sand ${heightClassName}`}>
      <MapContainer
        center={center ?? (CAMEROON_CENTER as [number, number])}
        zoom={zoom ?? CAMEROON_DEFAULT_ZOOM}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        zoomControl={interactive}
        attributionControl
        className="h-full w-full"
        style={{ background: '#F5EFE0' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!center && fitToPoints && <FitBounds points={positions} />}

        {points.map(({ place, position }) => {
          const meta = getCategoryMeta(place.category);
          const active = place.id === selectedId;
          return (
            <Marker
              key={place.id}
              position={position}
              icon={buildIcon(meta.pin, active)}
            >
              <Popup>
                <div className="min-w-[160px] space-y-1">
                  <p className="text-sm font-bold text-charcoal">{place.name}</p>
                  <p className="text-[11px] font-medium" style={{ color: meta.pin }}>
                    {categoryLabel(place.category)}
                    {place.region ? ` · ${place.region}` : ''}
                  </p>
                  {onSelect && (
                    <button
                      type="button"
                      onClick={() => onSelect(place)}
                      className="mt-1 w-full rounded-md bg-forest px-2 py-1 text-[12px] font-semibold text-white hover:bg-forest-dark"
                    >
                      {t('openPlace')}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
