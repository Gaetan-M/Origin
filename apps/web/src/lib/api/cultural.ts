import type { VisibilityScope } from '@origin/shared-types';
import { apiClient } from './client';

/**
 * Web-side view models for the PUBLIC cultural discovery world.
 *
 * These mirror the read shape the `/public-feed` + `/cultural-content` API is
 * expected to expose (see INTEGRATION NEEDED in the story summary). They live
 * here — not in shared-types — until the public contract is published in
 * @origin/shared-types, mirroring the family-feed approach.
 *
 * IMPORTANT: the public payload NEVER carries family-graph edges, relationship
 * degrees, phone numbers, or any private person data — only the cultural
 * content itself plus author / authority public display info.
 */

/** Mirrors prisma enum CulturalContentType. Kept local to stay decoupled. */
export type CulturalContentType =
  | 'LANGUAGE'
  | 'RECIPE'
  | 'TALE'
  | 'PROVERB'
  | 'RITE'
  | 'CUSTOM'
  | 'MUSIC'
  | 'OTHER';

export const CULTURAL_CONTENT_TYPES: readonly CulturalContentType[] = [
  'LANGUAGE',
  'RECIPE',
  'TALE',
  'PROVERB',
  'RITE',
  'CUSTOM',
  'MUSIC',
  'OTHER',
] as const;

/** Mirrors prisma enum CulturalAuthorityKind. */
export type CulturalAuthorityKind = 'CHEFFERIE' | 'EXPERT' | 'INSTITUTION';

/** Mirrors prisma enum ModerationStatus. */
export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Public-safe author identity (display name only — never phone/private data). */
export interface CulturalAuthor {
  accountId: string;
  displayName: string;
}

/** Public-safe authority summary shown on a verified-content badge. */
export interface CulturalAuthoritySummary {
  id: string;
  kind: CulturalAuthorityKind;
  displayName: string;
  region?: string | null;
  ethnicGroup?: string | null;
  verified: boolean;
}

export interface CulturalContentItem {
  id: string;
  contentType: CulturalContentType;
  title: string;
  body?: string | null;
  languageCode?: string | null;
  region?: string | null;
  ethnicGroup?: string | null;
  /** Resolved public media URL, if any media was attached. */
  mediaUrl?: string | null;
  author: CulturalAuthor;
  /** Present only when authored under a cultural authority (chefferie/expert). */
  authority?: CulturalAuthoritySummary | null;
  isFromVerifiedAuthority: boolean;
  visibilityScope: VisibilityScope;
  moderationStatus: ModerationStatus;
  createdAt: string;
}

export interface CulturalFeedPage {
  items: CulturalContentItem[];
  nextCursor: string | null;
}

export interface CulturalFeedQuery {
  cursor?: string | null;
  limit?: number;
  /** Optional content-type facet filter. */
  contentType?: CulturalContentType | null;
}

export interface CreateCulturalContentInput {
  contentType: CulturalContentType;
  title: string;
  body?: string | null;
  languageCode?: string | null;
  region?: string | null;
  ethnicGroup?: string | null;
}

/**
 * GET /public-feed — cursor-paginated PUBLIC discovery feed of approved
 * cultural-heritage content. Verified-authority content is prioritised
 * server-side. Returns only public-safe fields.
 */
export async function getPublicFeed(query?: CulturalFeedQuery): Promise<CulturalFeedPage> {
  const params = new URLSearchParams();
  if (query?.cursor) params.set('cursor', query.cursor);
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.contentType) params.set('contentType', query.contentType);
  const qs = params.toString();
  const { data } = await apiClient<CulturalFeedPage>(`/public-feed${qs ? `?${qs}` : ''}`);
  return data;
}

/**
 * POST /cultural-content — submit a new cultural-heritage contribution. The
 * server creates it as moderation_status=PENDING (community) and writes a
 * Contribution audit row. Returns the created item.
 */
export async function createCulturalContent(
  input: CreateCulturalContentInput,
): Promise<CulturalContentItem> {
  const { data } = await apiClient<CulturalContentItem>('/cultural-content', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data;
}
