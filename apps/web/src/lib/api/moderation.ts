import { apiClient } from './client';

/**
 * Web-side client for the MODERATION surface of the engagement layer. Lets a
 * MODERATOR+ review user-contributed photos and edit-suggestions queued against
 * tourism places and cultural content.
 *
 * Mirrors the FROZEN moderation API contract. The JWT carries the role
 * server-side; these endpoints reject non-moderators. Photo `url` is RELATIVE
 * to the API host — callers resolve it with mediaAbsoluteUrl().
 */

/** The discriminator shared by every moderation target. */
export type ModerationTargetType = 'TOURISM_PLACE' | 'CULTURAL_CONTENT';

/** A moderator's verdict on a pending item. */
export type ModerationDecision = 'APPROVE' | 'REJECT';

/** Lifecycle status of a queued contribution. */
export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Fields a user can propose an edit on (matches the engagement contract). */
export type SuggestionField =
  | 'name'
  | 'description'
  | 'region'
  | 'location'
  | 'title'
  | 'body'
  | 'ethnicGroup';

/** A pending contributed photo awaiting review. */
export interface PendingPhoto {
  id: string;
  targetType: ModerationTargetType;
  targetId: string;
  /** RELATIVE to the API host (e.g. "/media/<id>/file"). */
  url: string;
  caption: string | null;
  authorDisplayName: string | null;
  status: ModerationStatus;
  createdAt: string;
}

/** A pending edit-suggestion awaiting review. */
export interface PendingSuggestion {
  id: string;
  targetType: ModerationTargetType;
  targetId: string;
  field: SuggestionField | string;
  proposedValue: string;
  note: string | null;
  authorDisplayName: string | null;
  status: ModerationStatus;
  createdAt: string;
}

/** Shape returned by the moderate mutations. */
export interface ModerationResult {
  id: string;
  status: ModerationStatus;
}

/** GET /engagement/moderation/photos?status=PENDING */
export async function getPendingPhotos(): Promise<PendingPhoto[]> {
  const { data } = await apiClient<{ items: PendingPhoto[] }>(
    '/engagement/moderation/photos?status=PENDING',
  );
  return data.items;
}

/** POST /engagement/photos/:id/moderate */
export async function moderatePhoto(
  id: string,
  decision: ModerationDecision,
): Promise<ModerationResult> {
  const { data } = await apiClient<ModerationResult>(`/engagement/photos/${id}/moderate`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
  return data;
}

/** GET /engagement/moderation/suggestions?status=PENDING */
export async function getPendingSuggestions(): Promise<PendingSuggestion[]> {
  const { data } = await apiClient<{ items: PendingSuggestion[] }>(
    '/engagement/moderation/suggestions?status=PENDING',
  );
  return data.items;
}

/** POST /engagement/suggestions/:id/moderate */
export async function moderateSuggestion(
  id: string,
  decision: ModerationDecision,
): Promise<ModerationResult> {
  const { data } = await apiClient<ModerationResult>(`/engagement/suggestions/${id}/moderate`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
  return data;
}
