import { apiClient } from './client';

export interface FamilyCode {
  id: string;
  code: string;
  accountId: string;
  label: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  _count?: { uses: number };
}

export interface CreateFamilyCodeRequest {
  label?: string;
  maxUses?: number;
  expiryDays?: number;
}

export interface RedeemFamilyCodeResponse {
  redeemed: boolean;
  familyCode: { id: string; code: string; label: string | null };
  generator: { accountId: string; displayName: string };
}

export async function createFamilyCode(dto: CreateFamilyCodeRequest): Promise<FamilyCode> {
  const { data } = await apiClient<FamilyCode>('/family-codes', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function getMyFamilyCodes(): Promise<FamilyCode[]> {
  const { data } = await apiClient<FamilyCode[]>('/family-codes');
  return data;
}

export async function revokeFamilyCode(id: string): Promise<FamilyCode> {
  const { data } = await apiClient<FamilyCode>(`/family-codes/${id}`, { method: 'DELETE' });
  return data;
}

export async function redeemFamilyCode(code: string): Promise<RedeemFamilyCodeResponse> {
  const { data } = await apiClient<RedeemFamilyCodeResponse>('/family-codes/redeem', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return data;
}

export interface FamilyCodeUses {
  code: { id: string; code: string; label: string | null };
  uses: Array<{
    id: string;
    usedAt: string;
    account: { id: string; phoneNumber: string; displayName: string | null };
  }>;
}

export async function getFamilyCodeUses(codeId: string): Promise<FamilyCodeUses> {
  const { data } = await apiClient<FamilyCodeUses>(`/family-codes/${codeId}/uses`);
  return data;
}
