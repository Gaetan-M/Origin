import type { Claim, CreateClaimDto, DisputeClaimDto } from '@origin/shared-types';
import { apiClient } from './client';

export async function createClaim(dto: CreateClaimDto): Promise<Claim> {
  const { data } = await apiClient<Claim>('/claims', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function validateClaim(id: string): Promise<Claim> {
  const { data } = await apiClient<Claim>(`/claims/${id}/validate`, { method: 'POST' });
  return data;
}

export async function disputeClaim(id: string, dto: DisputeClaimDto): Promise<Claim> {
  const { data } = await apiClient<Claim>(`/claims/${id}/dispute`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function getPendingClaims(): Promise<Claim[]> {
  const { data } = await apiClient<Claim[]>('/claims/pending');
  return data;
}

export async function getMyClaims(): Promise<Claim[]> {
  const { data } = await apiClient<Claim[]>('/claims/mine');
  return data;
}

export async function deleteClaim(id: string): Promise<void> {
  await apiClient(`/claims/${id}`, { method: 'DELETE' });
}
