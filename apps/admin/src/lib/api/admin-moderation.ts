import { apiClient } from '@/lib/api/client';

export interface QueueCounts {
  claims: { pending: number; disputed: number };
  merges: { pending: number };
  verifications: { pending: number; inReview: number };
  identityDocuments: { pendingReview: number };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PersonPreview {
  id: string;
  displayName: string;
  gender: string | null;
  lifeStatus: string;
  birthYearApproximate: number | null;
  deceasedYearApproximate: number | null;
  villageOrigin: string | null;
  birthRegion: string | null;
  birthCountry: string | null;
}

export interface ClaimRow {
  id: string;
  status: string;
  evidence: string | null;
  createdAt: string;
  account: { id: string; phoneNumber: string };
  person: PersonPreview;
}

export interface MergeRow {
  id: string;
  matchScore: number;
  matchingSignals: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  personA: PersonPreview;
  personB: PersonPreview;
}

export interface VerificationRow {
  id: string;
  requestType: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  priority: number;
  status: string;
  submittedAt: string;
  assignedModeratorId: string | null;
  submittedByAccount: { id: string; phoneNumber: string } | null;
}

export interface IdentityDocumentRow {
  id: string;
  documentType: string;
  documentNumberLast4: string | null;
  issuingAuthority: string | null;
  issueDate: string | null;
  verificationStatus: string;
  createdAt: string;
  person: { id: string; displayName: string };
}

function buildQuery(params: Record<string, unknown> | undefined): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (typeof value === 'boolean') {
      usp.set(key, value ? 'true' : 'false');
      return;
    }
    usp.set(key, String(value));
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export async function getQueueCounts(): Promise<QueueCounts> {
  const { data } = await apiClient<QueueCounts>('/admin/moderation/queue');
  return data;
}

export async function listClaims(params: { status?: string; page?: number; limit?: number } = {}): Promise<PaginatedResult<ClaimRow>> {
  const { data } = await apiClient<PaginatedResult<ClaimRow>>(`/admin/moderation/claims${buildQuery(params)}`);
  return data;
}

export async function approveClaim(id: string, note?: string): Promise<void> {
  await apiClient<void>(`/admin/moderation/claims/${id}/approve`, { method: 'POST', body: JSON.stringify({ note }) });
}
export async function rejectClaim(id: string, reason: string): Promise<void> {
  await apiClient<void>(`/admin/moderation/claims/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
}
export async function disputeClaim(id: string, reason: string): Promise<void> {
  await apiClient<void>(`/admin/moderation/claims/${id}/dispute`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function listMerges(params: { status?: string; page?: number; limit?: number } = {}): Promise<PaginatedResult<MergeRow>> {
  const { data } = await apiClient<PaginatedResult<MergeRow>>(`/admin/moderation/merges${buildQuery(params)}`);
  return data;
}
export async function approveMerge(id: string, keeperPersonId: string, reason?: string): Promise<void> {
  await apiClient<void>(`/admin/moderation/merges/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ keeperPersonId, reason }),
  });
}
export async function rejectMerge(id: string, reason: string): Promise<void> {
  await apiClient<void>(`/admin/moderation/merges/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function listVerifications(params: { page?: number; limit?: number } = {}): Promise<PaginatedResult<VerificationRow>> {
  const { data } = await apiClient<PaginatedResult<VerificationRow>>(`/admin/moderation/verifications${buildQuery(params)}`);
  return data;
}
export async function assignVerification(id: string): Promise<void> {
  await apiClient<void>(`/admin/moderation/verifications/${id}/assign-to-me`, { method: 'POST' });
}
export async function resolveVerification(id: string, decision: 'APPROVED' | 'REJECTED', note?: string): Promise<void> {
  await apiClient<void>(`/admin/moderation/verifications/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ decision, note }),
  });
}

export async function listIdentityDocuments(params: { page?: number; limit?: number } = {}): Promise<PaginatedResult<IdentityDocumentRow>> {
  const { data } = await apiClient<PaginatedResult<IdentityDocumentRow>>(`/admin/moderation/identity-documents${buildQuery(params)}`);
  return data;
}
export async function verifyDocument(id: string, note?: string): Promise<void> {
  await apiClient<void>(`/admin/moderation/identity-documents/${id}/verify`, { method: 'POST', body: JSON.stringify({ note }) });
}
export async function rejectDocument(id: string, reason: string): Promise<void> {
  await apiClient<void>(`/admin/moderation/identity-documents/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
}
