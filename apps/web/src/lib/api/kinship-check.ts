import { apiClient } from './client';

/**
 * Web-side view models for the "Sommes-nous parents ?" (Are we related?) flow.
 *
 * PRIVACY INVARIANT (non-negotiable): the computed RESULT payload may ever only
 * carry { related, degree, label }. It NEVER carries person ids, names,
 * ancestors, the graph path, the other user's tree, or a phone number. The
 * compute step reads the global graph internally (GraphDegreeService) and
 * discards everything except the aggregate degree + a derived human label.
 *
 * These types mirror the read shape the `/kinship-checks` API is expected to
 * expose (see INTEGRATION NEEDED). They live here — not in shared-types — until
 * the API contract is published in @origin/shared-types.
 */

export type KinshipCheckStatus =
  | 'PENDING_CONSENT'
  | 'CONSENTED'
  | 'DECLINED'
  | 'COMPUTED'
  | 'EXPIRED'
  | 'CANCELLED';

/** Whether the current account initiated this check or received it. */
export type KinshipCheckDirection = 'incoming' | 'outgoing';

/**
 * The ONLY result shape ever surfaced to a user. Bilingual labels are computed
 * server-side from the degree so the client never derives kinship from raw data.
 */
export interface KinshipResult {
  related: boolean;
  /** Relationship degree through the global graph, or null when unrelated. */
  degree: number | null;
  labelFr: string;
  labelEn: string;
}

export interface KinshipCheckView {
  id: string;
  status: KinshipCheckStatus;
  direction: KinshipCheckDirection;
  /**
   * Display name of the counterparty — surfaced ONLY so a target can give
   * informed consent ("X souhaite vérifier votre lien"). Never a phone, never a
   * tree, never a person id. Null when the target was invited by a raw phone
   * number and has not yet resolved to an account.
   */
  counterpartyName: string | null;
  /** True when this check was opened against a phone number not yet on Origin. */
  invitedByPhone: boolean;
  createdAt: string;
  expiresAt: string | null;
  /** Present ONLY once status === 'COMPUTED' and both parties consented. */
  result: KinshipResult | null;
}

export interface KinshipChecksOverview {
  incoming: KinshipCheckView[];
  outgoing: KinshipCheckView[];
}

export interface InitiateKinshipCheckInput {
  /** E.164 phone number of the other party (e.g. +237...). */
  targetPhone?: string;
  /** Existing reusable family code identifying the other party / branch. */
  familyCode?: string;
}

/** GET /kinship-checks — the caller's incoming + outgoing checks. */
export async function getKinshipChecks(): Promise<KinshipChecksOverview> {
  const { data } = await apiClient<KinshipChecksOverview>('/kinship-checks');
  return data;
}

/** POST /kinship-checks — open a new check (requester consent is implicit). */
export async function initiateKinshipCheck(
  input: InitiateKinshipCheckInput,
): Promise<KinshipCheckView> {
  const { data } = await apiClient<KinshipCheckView>('/kinship-checks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data;
}

/**
 * POST /kinship-checks/:id/consent — target grants consent. The server computes
 * the result ONLY after this call (both parties now consent) and returns the
 * updated view, including the privacy-safe result when ready.
 */
export async function consentKinshipCheck(id: string): Promise<KinshipCheckView> {
  const { data } = await apiClient<KinshipCheckView>(`/kinship-checks/${id}/consent`, {
    method: 'POST',
  });
  return data;
}

/** POST /kinship-checks/:id/decline — target declines; no computation occurs. */
export async function declineKinshipCheck(id: string): Promise<KinshipCheckView> {
  const { data } = await apiClient<KinshipCheckView>(`/kinship-checks/${id}/decline`, {
    method: 'POST',
  });
  return data;
}

/** POST /kinship-checks/:id/cancel — requester withdraws an outgoing check. */
export async function cancelKinshipCheck(id: string): Promise<KinshipCheckView> {
  const { data } = await apiClient<KinshipCheckView>(`/kinship-checks/${id}/cancel`, {
    method: 'POST',
  });
  return data;
}
