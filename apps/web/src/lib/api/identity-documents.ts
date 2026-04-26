import type { IdentityDocument, CreateIdentityDocumentDto } from '@origin/shared-types';
import { apiClient } from './client';

export async function createIdentityDocument(dto: CreateIdentityDocumentDto): Promise<IdentityDocument> {
  const { data } = await apiClient<IdentityDocument>('/identity-documents', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function getPersonDocuments(personId: string): Promise<IdentityDocument[]> {
  const { data } = await apiClient<IdentityDocument[]>(`/identity-documents/person/${personId}`);
  return data;
}

export async function revealDocument(id: string): Promise<IdentityDocument & { documentNumber: string }> {
  const { data } = await apiClient<IdentityDocument & { documentNumber: string }>(`/identity-documents/${id}/reveal`);
  return data;
}

export async function verifyDocument(id: string): Promise<IdentityDocument> {
  const { data } = await apiClient<IdentityDocument>(`/identity-documents/${id}/verify`, { method: 'POST' });
  return data;
}

export async function deleteIdentityDocument(id: string): Promise<void> {
  await apiClient(`/identity-documents/${id}`, { method: 'DELETE' });
}
