import type {
  AdminAccount,
  AdminAuditLog,
  AccountRole,
  Contribution,
} from '@origin/shared-types';
import { apiClient } from '@/lib/api/client';

export interface AdminAccountListParams {
  search?: string;
  role?: AccountRole | 'ALL';
  isBanned?: boolean;
  includeDeleted?: boolean;
  hasClaim?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminAccountListResult {
  items: AdminAccount[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminAccountStats {
  claimCount: number;
  personCount: number;
  contributionCount: number;
}

export interface AdminAccountLastLogin {
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  lastLoginDeviceId: string | null;
}

export interface AdminAccountDetail {
  account: AdminAccount;
  stats: AdminAccountStats;
  lastLogins: AdminAccountLastLogin[];
}

export interface UpdateAccountDto {
  fullName?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface ChangeRoleDto {
  role: AccountRole;
  reason: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
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

export async function listAccounts(
  params: AdminAccountListParams = {},
): Promise<AdminAccountListResult> {
  const normalized: Record<string, unknown> = { ...params };
  if (normalized.role === 'ALL') delete normalized.role;
  const { data } = await apiClient<AdminAccountListResult>(
    `/admin/accounts${buildQuery(normalized)}`,
  );
  return data;
}

export async function getAccount(id: string): Promise<AdminAccountDetail> {
  const { data } = await apiClient<AdminAccountDetail>(`/admin/accounts/${id}`);
  return data;
}

export async function updateAccount(
  id: string,
  dto: UpdateAccountDto,
): Promise<AdminAccount> {
  const { data } = await apiClient<AdminAccount>(`/admin/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function changeRole(id: string, dto: ChangeRoleDto): Promise<AdminAccount> {
  const { data } = await apiClient<AdminAccount>(`/admin/accounts/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function banAccount(id: string, reason: string): Promise<AdminAccount> {
  const { data } = await apiClient<AdminAccount>(`/admin/accounts/${id}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return data;
}

export async function unbanAccount(id: string): Promise<AdminAccount> {
  const { data } = await apiClient<AdminAccount>(`/admin/accounts/${id}/unban`, {
    method: 'POST',
  });
  return data;
}

export async function softDeleteAccount(id: string, reason: string): Promise<void> {
  await apiClient<void>(`/admin/accounts/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

export async function restoreAccount(id: string): Promise<AdminAccount> {
  const { data } = await apiClient<AdminAccount>(`/admin/accounts/${id}/restore`, {
    method: 'POST',
  });
  return data;
}

export async function listAccountContributions(
  id: string,
  params: { page?: number; limit?: number } = {},
): Promise<PaginatedResult<Contribution>> {
  const { data } = await apiClient<PaginatedResult<Contribution>>(
    `/admin/accounts/${id}/contributions${buildQuery(params)}`,
  );
  return data;
}

export async function listAccountAuditTrail(
  id: string,
  params: { page?: number; limit?: number } = {},
): Promise<PaginatedResult<AdminAuditLog>> {
  const { data } = await apiClient<PaginatedResult<AdminAuditLog>>(
    `/admin/accounts/${id}/audit-trail${buildQuery(params)}`,
  );
  return data;
}
