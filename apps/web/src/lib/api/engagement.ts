import { apiClient } from './client';

/**
 * Web-side client for the public ENGAGEMENT layer that makes tourism places and
 * cultural-heritage content "alive": reactions, comments, contributed photos,
 * star ratings (tourism only) and "suggest an edit".
 *
 * These shapes mirror the FROZEN engagement API contract (a parallel agent is
 * building the matching NestJS module against the same contract). They live here
 * — not in @origin/shared-types — mirroring the tourism / cultural approach,
 * until the public contract is published.
 *
 * The base path is keyed by a `targetType` discriminator so a single module
 * serves both surfaces:
 *   /engagement/:targetType/:targetId/...   with targetType ∈
 *   { 'tourism-place', 'cultural-content' }.
 */

/** Discriminates which public surface an engagement target lives on. */
export type EngagementTarget = 'tourism-place' | 'cultural-content';

/** The fixed reaction palette shared by both surfaces. */
export type EngagementReactionType = 'LIKE' | 'LOVE' | 'WOW' | 'VISITED';

export const ENGAGEMENT_REACTION_TYPES: readonly EngagementReactionType[] = [
  'LIKE',
  'LOVE',
  'WOW',
  'VISITED',
] as const;

/** Per-type reaction counts. */
export interface ReactionCounts {
  LIKE: number;
  LOVE: number;
  WOW: number;
  VISITED: number;
}

/** Aggregated rating, present only for tourism places. */
export interface RatingSummary {
  average: number;
  count: number;
  /** The caller's own rating (1-5), or null if they haven't rated. */
  mine: number | null;
}

/** Full engagement summary for one target's detail view. */
export interface EngagementSummary {
  reactions: ReactionCounts;
  totalReactions: number;
  myReaction: EngagementReactionType | null;
  commentCount: number;
  photoCount: number;
  /** null for cultural-content (rating is tourism-only). */
  rating: RatingSummary | null;
}

/** Compact per-target counts used to make list cards feel alive. */
export interface EngagementCounts {
  totalReactions: number;
  commentCount: number;
  photoCount: number;
  ratingAverage: number | null;
  ratingCount: number;
}

/** Map of id → compact counts, returned by the batch endpoint. */
export type EngagementBatchResult = Record<string, EngagementCounts>;

/** Shape returned by reaction mutations (PUT / DELETE). */
export interface ReactionMutationResult {
  myReaction: EngagementReactionType | null;
  reactions: ReactionCounts;
  totalReactions: number;
}

export interface EngagementComment {
  id: string;
  body: string;
  authorDisplayName: string;
  accountId: string;
  createdAt: string;
  /** True when the caller authored this comment (enables delete). */
  mine: boolean;
}

export interface EngagementCommentPage {
  items: EngagementComment[];
  nextCursor: string | null;
}

export interface EngagementPhoto {
  id: string;
  url: string;
  caption?: string | null;
  authorDisplayName: string;
  createdAt: string;
}

export interface EngagementPhotoList {
  items: EngagementPhoto[];
}

export interface AddPhotoResult {
  id: string;
  status: string;
}

export interface SuggestEditResult {
  id: string;
  status: string;
}

/** Fields a user can propose an edit on, per target type. */
export type SuggestEditField =
  | 'name'
  | 'description'
  | 'region'
  | 'location'
  | 'title'
  | 'body'
  | 'ethnicGroup';

function base(target: EngagementTarget, id: string): string {
  return `/engagement/${target}/${id}`;
}

/** GET /engagement/:targetType/:targetId/summary */
export async function getEngagementSummary(
  target: EngagementTarget,
  id: string,
): Promise<EngagementSummary> {
  const { data } = await apiClient<EngagementSummary>(`${base(target, id)}/summary`);
  return data;
}

/** POST /engagement/summary/batch — compact counts for many ids at once. */
export async function getEngagementBatch(
  target: EngagementTarget,
  ids: string[],
): Promise<EngagementBatchResult> {
  if (ids.length === 0) return {};
  const { data } = await apiClient<EngagementBatchResult>('/engagement/summary/batch', {
    method: 'POST',
    body: JSON.stringify({ targetType: target, ids }),
  });
  return data;
}

/** PUT /engagement/:targetType/:targetId/reaction — set/replace my reaction. */
export async function setReaction(
  target: EngagementTarget,
  id: string,
  type: EngagementReactionType,
): Promise<ReactionMutationResult> {
  const { data } = await apiClient<ReactionMutationResult>(`${base(target, id)}/reaction`, {
    method: 'PUT',
    body: JSON.stringify({ type }),
  });
  return data;
}

/** DELETE /engagement/:targetType/:targetId/reaction — clear my reaction. */
export async function clearReaction(
  target: EngagementTarget,
  id: string,
): Promise<ReactionMutationResult> {
  const { data } = await apiClient<ReactionMutationResult>(`${base(target, id)}/reaction`, {
    method: 'DELETE',
  });
  return data;
}

/** GET /engagement/:targetType/:targetId/comments?cursor&limit */
export async function getComments(
  target: EngagementTarget,
  id: string,
  query?: { cursor?: string | null; limit?: number },
): Promise<EngagementCommentPage> {
  const params = new URLSearchParams();
  if (query?.cursor) params.set('cursor', query.cursor);
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  const { data } = await apiClient<EngagementCommentPage>(
    `${base(target, id)}/comments${qs ? `?${qs}` : ''}`,
  );
  return data;
}

/** POST /engagement/:targetType/:targetId/comments */
export async function addComment(
  target: EngagementTarget,
  id: string,
  body: string,
): Promise<EngagementComment> {
  const { data } = await apiClient<EngagementComment>(`${base(target, id)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  return data;
}

/** DELETE /engagement/comments/:id */
export async function deleteComment(commentId: string): Promise<void> {
  await apiClient(`/engagement/comments/${commentId}`, { method: 'DELETE' });
}

/** GET /engagement/:targetType/:targetId/photos */
export async function getPhotos(
  target: EngagementTarget,
  id: string,
): Promise<EngagementPhotoList> {
  const { data } = await apiClient<EngagementPhotoList>(`${base(target, id)}/photos`);
  return data;
}

/** POST /engagement/:targetType/:targetId/photos */
export async function addPhoto(
  target: EngagementTarget,
  id: string,
  mediaId: string,
  caption?: string,
): Promise<AddPhotoResult> {
  const { data } = await apiClient<AddPhotoResult>(`${base(target, id)}/photos`, {
    method: 'POST',
    body: JSON.stringify({ mediaId, caption }),
  });
  return data;
}

/** POST /engagement/:targetType/:targetId/rating — tourism-place only. */
export async function ratePlace(
  target: EngagementTarget,
  id: string,
  stars: number,
): Promise<RatingSummary> {
  const { data } = await apiClient<RatingSummary>(`${base(target, id)}/rating`, {
    method: 'POST',
    body: JSON.stringify({ stars }),
  });
  return data;
}

/** POST /engagement/:targetType/:targetId/suggest-edit */
export async function suggestEdit(
  target: EngagementTarget,
  id: string,
  input: { field: SuggestEditField; proposedValue: string; note?: string },
): Promise<SuggestEditResult> {
  const { data } = await apiClient<SuggestEditResult>(`${base(target, id)}/suggest-edit`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data;
}
