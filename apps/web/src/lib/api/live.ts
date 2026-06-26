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
  /**
   * Short, shareable code used to build a join deep-link (/lives/join/:code).
   * The API resolves it back to a session via /live/join-by-code/:code. May be
   * null on older rows or when the caller is not allowed to invite.
   */
  inviteCode: string | null;
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

/** Start a SCHEDULED session (host only). Flips it to LIVE. */
export async function startLiveSession(id: string): Promise<LiveSession> {
  const { data } = await apiClient<LiveSession>(`/live/${id}/start`, {
    method: 'POST',
  });
  return data;
}

/** End a LIVE session (host only). Flips it to ENDED and triggers replay prep. */
export async function endLiveSession(id: string): Promise<LiveSession> {
  const { data } = await apiClient<LiveSession>(`/live/${id}/end`, {
    method: 'POST',
  });
  return data;
}

/** Delete a session in ANY status (host only). Soft-delete; removes it from lists. */
export async function deleteLiveSession(
  id: string,
): Promise<{ id: string; deleted: true }> {
  const { data } = await apiClient<{ id: string; deleted: true }>(`/live/${id}`, {
    method: 'DELETE',
  });
  return data;
}

/**
 * Ensure the session has a shareable invite code (host only). Idempotent —
 * returns the session with a non-null `inviteCode`, generating one if the
 * session (e.g. an older one) didn't have it yet.
 */
export async function ensureLiveInviteCode(id: string): Promise<LiveSession> {
  const { data } = await apiClient<LiveSession>(`/live/${id}/invite-code`, {
    method: 'POST',
  });
  return data;
}

/**
 * Resolve an invite code to its live session. Used by the public-ish join
 * deep-link page (/lives/join/:code). Visibility is still enforced server-side.
 */
export async function getLiveSessionByCode(code: string): Promise<LiveSession> {
  const { data } = await apiClient<LiveSession>(
    `/live/join-by-code/${encodeURIComponent(code)}`,
  );
  return data;
}

export interface RaiseHandResponse {
  /** New raised state after the toggle. */
  raised: boolean;
}

/**
 * Toggle the caller's "raised hand" for a session. Persisted server-side so the
 * host is notified even if the realtime data-channel ping is missed.
 */
export async function raiseLiveHand(
  id: string,
  raised: boolean,
): Promise<RaiseHandResponse> {
  const { data } = await apiClient<RaiseHandResponse>(`/live/${id}/raise-hand`, {
    method: 'POST',
    body: JSON.stringify({ raised }),
  });
  return data;
}

export interface InviteToLiveInput {
  /** Persons from the caller's family graph to notify. */
  personIds?: string[];
  /** Raw E.164 phone numbers to invite (SMS / WhatsApp). */
  phoneNumbers?: string[];
}

export interface InviteToLiveResponse {
  invited: number;
}

/** Invite relatives (by person id) and/or phone numbers to a session. */
export async function inviteToLive(
  id: string,
  input: InviteToLiveInput,
): Promise<InviteToLiveResponse> {
  const { data } = await apiClient<InviteToLiveResponse>(`/live/${id}/invite`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data;
}

/** Host moderation action targeting one participant identity. */
export type HostParticipantAction = 'promote' | 'mute' | 'remove';

/**
 * Apply a host moderation action to a participant. `identity` is the LiveKit
 * participant identity (the account id encoded in the join token).
 */
export async function hostParticipantAction(
  id: string,
  identity: string,
  action: HostParticipantAction,
): Promise<void> {
  await apiClient(
    `/live/${id}/participants/${encodeURIComponent(identity)}/${action}`,
    { method: 'POST' },
  );
}
