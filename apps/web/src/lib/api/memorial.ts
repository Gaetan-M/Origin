import { VisibilityScope } from '@origin/shared-types';
import { apiClient } from './client';

export type MemorialTributeKind = 'CANDLE' | 'MESSAGE' | 'PHOTO' | 'VIDEO';

export interface MemorialTribute {
  id: string;
  personId: string;
  authorAccountId: string;
  /** Display name of the tribute author, when the API resolves it. */
  authorDisplayName: string | null;
  kind: MemorialTributeKind;
  message: string | null;
  mediaId: string | null;
  visibilityScope: VisibilityScope;
  createdAt: string;
}

export interface MemorialSummary {
  personId: string;
  candleCount: number;
  tributeCount: number;
}

export interface CreateTributeDto {
  kind: MemorialTributeKind;
  message?: string | null;
  mediaId?: string | null;
  visibilityScope?: VisibilityScope;
}

export async function getTributes(personId: string): Promise<MemorialTribute[]> {
  const { data } = await apiClient<MemorialTribute[]>(`/memorial/${personId}/tributes`);
  return data;
}

export async function getMemorialSummary(personId: string): Promise<MemorialSummary> {
  const { data } = await apiClient<MemorialSummary>(`/memorial/${personId}/summary`);
  return data;
}

export async function addTribute(
  personId: string,
  dto: CreateTributeDto,
): Promise<MemorialTribute> {
  const { data } = await apiClient<MemorialTribute>(`/memorial/${personId}/tributes`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function deleteTribute(tributeId: string): Promise<void> {
  await apiClient(`/memorial/tributes/${tributeId}`, { method: 'DELETE' });
}
