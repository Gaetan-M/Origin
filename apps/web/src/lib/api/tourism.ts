import type { VisibilityScope } from '@origin/shared-types';
import { apiClient } from './client';

/**
 * Web-side view models for the PUBLIC tourism / heritage-places surface.
 *
 * INDEPENDENCE (core value): official Ministry / NGO data is used STRICTLY as a
 * cited SOURCE with provenance shown — never as authority over the family
 * graph. A TourismPlace carries name/description/region/category/geo plus a
 * `source` (MINISTRY/NGO/COMMUNITY), a `sourceRef` provenance citation, and a
 * `verified` flag. It is NEVER coupled to private person data.
 *
 * These shapes mirror the read contract the `/tourism` API is expected to
 * expose (see INTEGRATION NEEDED). They live here — not in shared-types — until
 * the public contract is published, mirroring the cultural/family-feed approach.
 */

/** Mirrors prisma enum TourismSource. */
export type TourismSource = 'MINISTRY' | 'NGO' | 'COMMUNITY';

export const TOURISM_SOURCES: readonly TourismSource[] = [
  'MINISTRY',
  'NGO',
  'COMMUNITY',
] as const;

/** Mirrors prisma enum TourismCategory. */
export type TourismCategory =
  | 'HERITAGE'
  | 'NATURE'
  | 'CULTURE'
  | 'MUSEUM'
  | 'CHEFFERIE'
  | 'RELIGIOUS'
  | 'OTHER';

export const TOURISM_CATEGORIES: readonly TourismCategory[] = [
  'HERITAGE',
  'NATURE',
  'CULTURE',
  'MUSEUM',
  'CHEFFERIE',
  'RELIGIOUS',
  'OTHER',
] as const;

export interface TourismPlace {
  id: string;
  name: string;
  description?: string | null;
  region?: string | null;
  category: TourismCategory;
  latitude?: string | null;
  longitude?: string | null;
  source: TourismSource;
  /** Provenance citation / URL — shown verbatim so users can trace the source. */
  sourceRef?: string | null;
  /** Curated external image URL (e.g. Wikimedia Commons) for the postcard. */
  imageUrl?: string | null;
  verified: boolean;
  /** Resolved public media URL, if any media was attached. */
  mediaUrl?: string | null;
  visibilityScope: VisibilityScope;
  createdAt: string;
}

export interface TourismPlacePage {
  items: TourismPlace[];
  nextCursor: string | null;
}

export interface TourismPlaceQuery {
  cursor?: string | null;
  limit?: number;
  /** Optional region facet filter. */
  region?: string | null;
  /** Optional category facet filter. */
  category?: TourismCategory | null;
  /** When true, only verified (Ministry/NGO-sourced) places are returned. */
  verifiedOnly?: boolean;
}

export interface SubmitTourismPlaceInput {
  name: string;
  description?: string | null;
  region?: string | null;
  category: TourismCategory;
  latitude?: string | null;
  longitude?: string | null;
  source: TourismSource;
  sourceRef?: string | null;
}

/**
 * GET /tourism — cursor-paginated PUBLIC list of heritage / tourism places.
 * Verified, official-sourced places are prioritised server-side. Returns only
 * public-safe fields — never any family-graph or private person data.
 */
export async function getTourismPlaces(
  query?: TourismPlaceQuery,
): Promise<TourismPlacePage> {
  const params = new URLSearchParams();
  if (query?.cursor) params.set('cursor', query.cursor);
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.region) params.set('region', query.region);
  if (query?.category) params.set('category', query.category);
  if (query?.verifiedOnly) params.set('verifiedOnly', 'true');
  const qs = params.toString();
  const { data } = await apiClient<TourismPlacePage>(`/tourism${qs ? `?${qs}` : ''}`);
  return data;
}

/**
 * GET /tourism/:id — fetch a single PUBLIC place by id, provenance included.
 * Returns only public-safe fields — never any family-graph or person data.
 */
export async function getTourismPlace(id: string): Promise<TourismPlace> {
  const { data } = await apiClient<TourismPlace>(`/tourism/${id}`);
  return data;
}

/**
 * POST /tourism — submit a community-sourced place. The server creates it as
 * verified=false and routes it through moderation (source verification reuses
 * the moderation queue), writing a Contribution audit row. Returns the created
 * place.
 */
export async function submitTourismPlace(
  input: SubmitTourismPlaceInput,
): Promise<TourismPlace> {
  const { data } = await apiClient<TourismPlace>('/tourism', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data;
}
