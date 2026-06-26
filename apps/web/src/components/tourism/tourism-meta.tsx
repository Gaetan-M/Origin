import {
  Landmark,
  Trees,
  Drama,
  Building2,
  Crown,
  Church,
  MapPin,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TourismCategory } from '@/lib/api/tourism';

/**
 * Shared visual metadata for the tourism vertical — kept in one place so the
 * card, the interactive map pins and the detail page stay perfectly in sync.
 *
 * Each category carries:
 *  - `icon`   : the lucide glyph used in chips / pins,
 *  - `accent` : Tailwind classes (bg + text) for chips and the round badge,
 *  - `pin`    : a raw hex colour used to paint the Leaflet map markers (which
 *               cannot consume Tailwind classes — they are injected as SVG).
 */
export interface CategoryMeta {
  icon: LucideIcon;
  accent: string;
  pin: string;
}

export function getCategoryMeta(category: TourismCategory): CategoryMeta {
  switch (category) {
    case 'HERITAGE':
      return { icon: Landmark, accent: 'bg-ochre/15 text-ochre', pin: '#D9A441' };
    case 'NATURE':
      return { icon: Trees, accent: 'bg-forest/10 text-forest', pin: '#2D7A4B' };
    case 'CULTURE':
      return { icon: Drama, accent: 'bg-terracotta/10 text-terracotta', pin: '#C8663B' };
    case 'MUSEUM':
      return { icon: Building2, accent: 'bg-charcoal/5 text-charcoal/60', pin: '#52525B' };
    case 'CHEFFERIE':
      return { icon: Crown, accent: 'bg-ochre/15 text-ochre', pin: '#B98421' };
    case 'RELIGIOUS':
      return { icon: Church, accent: 'bg-forest/10 text-forest', pin: '#1D5A35' };
    default:
      return { icon: MapPin, accent: 'bg-sand text-charcoal/60', pin: '#A8A29E' };
  }
}

/**
 * The 10 administrative regions of Cameroon (FR canonical names). Used to drive
 * the region facet without depending on whatever free-text the data carries.
 */
export const CAMEROON_REGIONS: readonly string[] = [
  'Adamaoua',
  'Centre',
  'Est',
  'Extrême-Nord',
  'Littoral',
  'Nord',
  'Nord-Ouest',
  'Ouest',
  'Sud',
  'Sud-Ouest',
] as const;

/** Approximate geographic centre of Cameroon — the default map focus. */
export const CAMEROON_CENTER: readonly [number, number] = [5.69, 12.74];
export const CAMEROON_DEFAULT_ZOOM = 6;

/** Safe float parse for the string lat/lng the API returns (decimal columns). */
export function parseCoord(value?: string | null): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** A place reduced to a valid geographic point, or null if it has no coords. */
export function toLatLng(
  lat?: string | null,
  lng?: string | null,
): [number, number] | null {
  const la = parseCoord(lat);
  const lo = parseCoord(lng);
  if (la == null || lo == null) return null;
  return [la, lo];
}

/**
 * Google Maps "directions to" deep link for a coordinate — opens turn-by-turn
 * navigation in the user's maps app (the "Comment y aller" action).
 */
export function directionsHref(lat?: string | null, lng?: string | null): string | null {
  const point = toLatLng(lat, lng);
  if (!point) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${point[0]},${point[1]}`;
}
