import type { CreateInvitationDto } from '@origin/shared-types';
import { apiClient } from './client';

export interface Invitation {
  id: string;
  token: string;
  invitedByAccountId: string;
  targetPersonId: string | null;
  targetPhoneNumber: string | null;
  relationshipHint: string | null;
  consumedByAccountId: string | null;
  consumedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export async function createInvitation(dto: CreateInvitationDto): Promise<Invitation> {
  const { data } = await apiClient<Invitation>('/invitations', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function verifyInvitation(token: string): Promise<Invitation> {
  const { data } = await apiClient<Invitation>(`/invitations/verify/${token}`, { skipAuth: true });
  return data;
}

export async function consumeInvitation(token: string): Promise<void> {
  await apiClient('/invitations/consume', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function getMyInvitations(): Promise<Invitation[]> {
  const { data } = await apiClient<Invitation[]>('/invitations/mine');
  return data;
}

export async function deleteInvitation(id: string): Promise<void> {
  await apiClient(`/invitations/${id}`, { method: 'DELETE' });
}
