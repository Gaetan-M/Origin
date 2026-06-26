import { VisibilityScope } from '@origin/shared-types';
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
  | 'OTHER'
  | 'PEOPLE';

export const CULTURAL_CONTENT_TYPES: readonly CulturalContentType[] = [
  'LANGUAGE',
  'RECIPE',
  'TALE',
  'PROVERB',
  'RITE',
  'CUSTOM',
  'MUSIC',
  'PEOPLE',
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
  /** Optional external hero image URL (e.g. Wikimedia Commons). */
  imageUrl?: string | null;
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
 * Raw item shape returned by `GET /public-feed` (the API's `PublicFeedItem`).
 * Sanitised, public-only: an attribution display name + a verified flag rather
 * than the full author/authority objects.
 */
interface PublicFeedApiItem {
  id: string;
  contentType: CulturalContentType;
  title: string;
  body: string | null;
  languageCode: string | null;
  region: string | null;
  ethnicGroup: string | null;
  mediaId: string | null;
  imageUrl: string | null;
  authorDisplayName: string | null;
  authorityVerified: boolean;
  createdAt: string;
}

interface PublicFeedApiPage {
  items: PublicFeedApiItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Maps a sanitised API item into the richer web view model. */
function toCulturalContentItem(raw: PublicFeedApiItem): CulturalContentItem {
  return {
    id: raw.id,
    contentType: raw.contentType,
    title: raw.title,
    body: raw.body,
    languageCode: raw.languageCode,
    region: raw.region,
    ethnicGroup: raw.ethnicGroup,
    imageUrl: raw.imageUrl,
    // The public feed has no resolved media URL; fall back to the external image.
    mediaUrl: raw.imageUrl,
    author: { accountId: '', displayName: raw.authorDisplayName ?? '' },
    authority: null,
    isFromVerifiedAuthority: raw.authorityVerified,
    visibilityScope: VisibilityScope.PUBLIC,
    moderationStatus: 'APPROVED',
    createdAt: raw.createdAt,
  };
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
  const { data } = await apiClient<PublicFeedApiPage>(`/public-feed${qs ? `?${qs}` : ''}`);
  return {
    items: data.items.map(toCulturalContentItem),
    nextCursor: data.nextCursor,
  };
}

/**
 * Raw single-item shape returned by `GET /cultural-content/:id` (the Prisma
 * `CulturalContent` model). Carries no resolved author display name — only the
 * authoring account id and the denormalised verified flag.
 */
interface CulturalContentApiRecord {
  id: string;
  contentType: CulturalContentType;
  title: string;
  body: string | null;
  languageCode: string | null;
  region: string | null;
  ethnicGroup: string | null;
  mediaId: string | null;
  imageUrl: string | null;
  isFromVerifiedAuthority: boolean;
  visibilityScope: VisibilityScope;
  moderationStatus: ModerationStatus;
  createdAt: string;
}

/**
 * GET /cultural-content/:id — fetch one cultural-heritage item for the detail
 * read view. Requires auth (the app is authenticated). Maps the raw record into
 * the web view model; the byline name is not resolved by this endpoint.
 */
export async function getCulturalContent(id: string): Promise<CulturalContentItem> {
  const { data } = await apiClient<CulturalContentApiRecord>(`/cultural-content/${id}`);
  return {
    id: data.id,
    contentType: data.contentType,
    title: data.title,
    body: data.body,
    languageCode: data.languageCode,
    region: data.region,
    ethnicGroup: data.ethnicGroup,
    imageUrl: data.imageUrl,
    mediaUrl: data.imageUrl,
    author: { accountId: '', displayName: '' },
    authority: null,
    isFromVerifiedAuthority: data.isFromVerifiedAuthority,
    visibilityScope: data.visibilityScope,
    moderationStatus: data.moderationStatus,
    createdAt: data.createdAt,
  };
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
