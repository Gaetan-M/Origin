import type { LifeStatus, VerificationLevel, AdminAuditLog, Contribution } from '@origin/shared-types';
import { apiClient } from '@/lib/api/client';

export interface AdminPersonRow {
  id: string;
  displayName: string;
  gender: string | null;
  lifeStatus: LifeStatus;
  birthYearApproximate: number | null;
  villageOrigin: string | null;
  birthRegion: string | null;
  birthCountry: string | null;
  hasPhoto: boolean;
  claimedByAccountId: string | null;
  primaryPhotoMediaId: string | null;
  claimCount: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface AdminPersonDetail {
  person: AdminPersonRow & {
    normalizedName?: string;
    biography?: string | null;
    occupation?: string | null;
    phoneNumber?: string | null;
    deceasedYearApproximate?: number | null;
    chefferie?: string | null;
    ethnicity?: string | null;
    isPublic: boolean;
    privacyLevel: number;
    verificationLevel: VerificationLevel;
    updatedAt: string;
  };
  names: Array<{ id: string; nameType: string; fullName: string; firstName: string | null; lastName: string | null; isPrimary: boolean }>;
  identityDocuments: Array<{ id: string; documentType: string; documentNumberLast4: string | null; verificationStatus: string; issuingAuthority: string | null; issueDate: string | null }>;
  claims: Array<{ id: string; status: string; createdAt: string; account: { id: string; phoneNumber: string; fullName: string | null } }>;
  parents: Array<{ id: string; relationshipType: string; parent: { id: string; displayName: string; gender: string | null; birthYearApproximate: number | null } }>;
  children: Array<{ id: string; relationshipType: string; child: { id: string; displayName: string; gender: string | null; birthYearApproximate: number | null } }>;
  unions: Array<{ id: string; partnerPersonId: string | null; partnerDisplayName: string | null }>;
  recentContributions: Contribution[];
  recentAuditTrail: AdminAuditLog[];
}

export interface AdminUpdatePersonDto {
  displayName?: string;
  gender?: string | null;
  lifeStatus?: LifeStatus;
  birthYearApproximate?: number | null;
  birthPlace?: string | null;
  birthRegion?: string | null;
  birthCountry?: string | null;
  deceasedYearApproximate?: number | null;
  ethnicity?: string | null;
  villageOrigin?: string | null;
  chefferie?: string | null;
  biography?: string | null;
  occupation?: string | null;
  phoneNumber?: string | null;
  isPublic?: boolean;
  privacyLevel?: number;
  verificationLevel?: VerificationLevel;
  reason: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminPersonsListParams {
  search?: string;
  lifeStatus?: string; // comma-separated
  hasPhoto?: boolean;
  hasClaim?: boolean;
  villageOrigin?: string;
  region?: string;
  country?: string;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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

export async function listPersons(params: AdminPersonsListParams = {}): Promise<PaginatedResult<AdminPersonRow>> {
  const { data } = await apiClient<PaginatedResult<AdminPersonRow>>(`/admin/persons${buildQuery(params)}`);
  return data;
}

export async function getPerson(id: string): Promise<AdminPersonDetail> {
  const { data } = await apiClient<AdminPersonDetail>(`/admin/persons/${id}`);
  return data;
}

export async function updatePerson(id: string, dto: AdminUpdatePersonDto): Promise<AdminPersonRow> {
  const { data } = await apiClient<AdminPersonRow>(`/admin/persons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function deletePerson(id: string, reason: string): Promise<void> {
  await apiClient<void>(`/admin/persons/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

export async function restorePerson(id: string): Promise<AdminPersonRow> {
  const { data } = await apiClient<AdminPersonRow>(`/admin/persons/${id}/restore`, {
    method: 'POST',
  });
  return data;
}

export async function listOrphans(params: { page?: number; limit?: number } = {}): Promise<PaginatedResult<AdminPersonRow>> {
  const { data } = await apiClient<PaginatedResult<AdminPersonRow>>(`/admin/persons/orphans${buildQuery(params)}`);
  return data;
}

export interface DuplicateGroup {
  key: { normalizedName: string; year: number | null };
  count: number;
  persons: AdminPersonRow[];
}

export async function listDuplicates(): Promise<{ groups: DuplicateGroup[] }> {
  const { data } = await apiClient<{ groups: DuplicateGroup[] }>('/admin/persons/duplicates');
  return data;
}

export async function forceMerge(keeperPersonId: string, loserPersonId: string, reason: string): Promise<void> {
  await apiClient<void>('/admin/persons/force-merge', {
    method: 'POST',
    body: JSON.stringify({ keeperPersonId, loserPersonId, reason }),
  });
}
