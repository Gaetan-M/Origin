import type { LifeEventKind, VisibilityScope } from '@origin/shared-types';
import { apiClient } from './client';

/**
 * Web-side view models for the family feed. These mirror the read shape the
 * `/family-feed` API is expected to expose (see INTEGRATION NEEDED in the story
 * summary). They intentionally live here — not in shared-types — until the API
 * contract is published in @origin/shared-types.
 */

export interface FeedAuthor {
  accountId: string;
  displayName: string;
}

export interface FeedSubjectPerson {
  id: string;
  displayName: string;
  lifeStatus: 'ALIVE' | 'DECEASED' | 'UNKNOWN';
  photoUrl?: string | null;
}

/** Aggregated reaction counts for one post, plus whether the caller reacted. */
export interface FeedReactionSummary {
  reactionType: string;
  count: number;
  reactedByMe: boolean;
}

export interface FeedComment {
  id: string;
  accountId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  /** Post category — 'BIRTH' | 'DEATH' | 'UNION' | 'ANNOUNCEMENT' | 'TEXT' ... */
  postType: string;
  body?: string | null;
  lifeEventId?: string | null;
  lifeEvent?: {
    kind: LifeEventKind;
    occurredAt?: string | null;
  } | null;
  /** Visibility OWNER person (the person the event is about). */
  subjectPerson?: FeedSubjectPerson | null;
  author: FeedAuthor;
  visibilityScope: VisibilityScope;
  reactions: FeedReactionSummary[];
  commentCount: number;
  /** Hydrated only when a single post is fetched, otherwise omitted. */
  comments?: FeedComment[];
  createdAt: string;
}

export interface FeedPage {
  items: FeedPost[];
  nextCursor: string | null;
}

export interface FeedQuery {
  cursor?: string | null;
  limit?: number;
}

/** GET /family-feed — cursor-paginated, degree-bounded FAMILY feed. */
export async function getFamilyFeed(query?: FeedQuery): Promise<FeedPage> {
  const params = new URLSearchParams();
  if (query?.cursor) params.set('cursor', query.cursor);
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  const { data } = await apiClient<FeedPage>(`/family-feed${qs ? `?${qs}` : ''}`);
  return data;
}

/** GET /family-feed/:postId/comments — full comment thread for one post. */
export async function getPostComments(postId: string): Promise<FeedComment[]> {
  const { data } = await apiClient<FeedComment[]>(`/family-feed/${postId}/comments`);
  return data;
}

/** POST /family-feed/:postId/reactions — add a reaction. */
export async function addReaction(postId: string, reactionType: string): Promise<void> {
  await apiClient(`/family-feed/${postId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ reactionType }),
  });
}

/** DELETE /family-feed/:postId/reactions/:reactionType — remove a reaction (soft delete). */
export async function removeReaction(postId: string, reactionType: string): Promise<void> {
  await apiClient(`/family-feed/${postId}/reactions/${reactionType}`, {
    method: 'DELETE',
  });
}

/** POST /family-feed/:postId/comments — add a comment. */
export async function addComment(postId: string, body: string): Promise<FeedComment> {
  const { data } = await apiClient<FeedComment>(`/family-feed/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  return data;
}
