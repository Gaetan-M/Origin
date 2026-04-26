import type { Account, Contribution, PaginationQuery } from '@origin/shared-types';
import { apiClient } from './client';

export async function getMyAccount(): Promise<Account> {
  const { data } = await apiClient<Account>('/accounts/me');
  return data;
}

export async function updateMyAccount(dto: Partial<Pick<Account, 'languagePreference' | 'dataSaverMode' | 'largeTextMode' | 'email' | 'whatsappEnabled'>>): Promise<Account> {
  const { data } = await apiClient<Account>('/accounts/me', {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function setPin(newPin: string, currentPin?: string): Promise<void> {
  await apiClient('/accounts/me/pin', {
    method: 'POST',
    body: JSON.stringify({ newPin, ...(currentPin ? { currentPin } : {}) }),
  });
}

export async function removePin(currentPin: string): Promise<void> {
  await apiClient('/accounts/me/pin', {
    method: 'DELETE',
    body: JSON.stringify({ currentPin }),
  });
}

export async function deleteMyAccount(): Promise<void> {
  await apiClient('/accounts/me', { method: 'DELETE' });
}

export interface PaginatedContributions {
  data: Contribution[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getMyContributions(query?: PaginationQuery): Promise<PaginatedContributions> {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  // Backend service returns { data, meta } which gets wrapped by interceptor
  const { data } = await apiClient<PaginatedContributions>(`/accounts/me/contributions${qs ? `?${qs}` : ''}`);
  return data;
}

export interface AccountStats {
  persons: {
    total: number;
    alive: number;
    deceased: number;
    unknown: number;
    male: number;
    female: number;
    other: number;
    withPhoto: number;
    withPhone: number;
    withBirth: number;
    birthYearMin: number | null;
    birthYearMax: number | null;
    generationSpan: number;
  };
  tree: {
    claimedPersonId: string;
    claimedPersonName: string;
    childrenCount: number;
    parentsCount: number;
    unionsCount: number;
  } | null;
  invitations: { sent: number; consumed: number; pending: number };
  familyCodes: { active: number; totalRedemptions: number };
  topVillages: Array<{ village: string; count: number }>;
  additionsByMonth: Array<{ month: string; count: number }>;
  notifications: { unread: number };
}

export async function getMyStats(): Promise<AccountStats> {
  const { data } = await apiClient<AccountStats>('/accounts/me/stats');
  return data;
}
