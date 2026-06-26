import { VisibilityScope } from '@origin/shared-types';
import { apiClient } from './client';

/**
 * Phase 5 — LIVE. Client bindings for the live-session API.
 *
 * LiveKit is NEVER touched here: the browser only ever receives a short-lived
 * ACCESS TOKEN minted server-side. When LiveKit env creds are unset the API
 * answers `{ configured: false }` and the UI degrades to a graceful
 * "coming soon" state — it must never crash.
 */

export type LiveSessionStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';

export type LiveSessionKind =
  | 'CEREMONY'
  | 'FAMILY_COUNCIL'
  | 'LESSON'
  | 'STORYTELLING'
  | 'MASTERCLASS'
  | 'OTHER';

export const LIVE_SESSION_KINDS: readonly LiveSessionKind[] = [
  'CEREMONY',
  'FAMILY_COUNCIL',
  'LESSON',
  'STORYTELLING',
  'MASTERCLASS',
  'OTHER',
] as const;

/** Visibility choices a host may pick when scheduling a live. */
export const LIVE_VISIBILITY_CHOICES: readonly VisibilityScope[] = [
  VisibilityScope.FAMILY,
  VisibilityScope.PUBLIC,
] as const;

export interface LiveSession {
  id: string;
  hostAccountId: string;
  hostAuthorityId: string | null;
  /** Display name of the host, when the API resolves it. */
  hostDisplayName: string | null;
  title: string;
  description: string | null;
  kind: LiveSessionKind;
  visibilityScope: VisibilityScope;
  visibleMaxDegree: number | null;
  subjectPersonId: string | null;
  roomName: string;
  status: LiveSessionStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  recordingMediaId: string | null;
  replayPublished: boolean;
  /** Convenience count the API may resolve; falls back to 0 when absent. */
  participantCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLiveSessionInput {
  title: string;
  kind: LiveSessionKind;
  description?: string | null;
  visibilityScope: VisibilityScope;
  visibleMaxDegree?: number | null;
  subjectPersonId?: string | null;
  /** ISO-8601 instant; null means "start now / unscheduled". */
  scheduledAt?: string | null;
}

/**
 * Response of GET /live/:id/token. `configured` reflects whether the server
 * has LiveKit creds; when false (or when `token` is null), the room renders
 * the graceful "coming soon" state instead of attempting a connection.
 */
export interface LiveTokenResponse {
  configured: boolean;
  token: string | null;
  serverUrl: string | null;
  roomName: string | null;
  identity: string | null;
}

/** Response of GET /live/:id/replay — a short-lived playback URL, if published. */
export interface LiveReplayResponse {
  /** Media kind so the UI picks <audio> vs <video>. Audio-first by default. */
  mediaKind: 'AUDIO' | 'VIDEO';
  url: string | null;
}

export interface ListLiveSessionsParams {
  /** Optional status filter; omit to fetch all visible sessions. */
  status?: LiveSessionStatus | null;
}

export async function listLiveSessions(
  params: ListLiveSessionsParams = {},
): Promise<LiveSession[]> {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  const qs = search.toString();
  const { data } = await apiClient<LiveSession[]>(`/live${qs ? `?${qs}` : ''}`);
  return data;
}

export async function getLiveSession(id: string): Promise<LiveSession> {
  const { data } = await apiClient<LiveSession>(`/live/${id}`);
  return data;
}

export async function createLiveSession(
  input: CreateLiveSessionInput,
): Promise<LiveSession> {
  const { data } = await apiClient<LiveSession>('/live', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data;
}

/** Mint (or refresh) the caller's join token for a live room. */
export async function getLiveToken(id: string): Promise<LiveTokenResponse> {
  const { data } = await apiClient<LiveTokenResponse>(`/live/${id}/token`);
  return data;
}

/** Fetch the replay playback URL for an ended, published session. */
export async function getLiveReplay(id: string): Promise<LiveReplayResponse> {
  const { data } = await apiClient<LiveReplayResponse>(`/live/${id}/replay`);
  return data;
}
