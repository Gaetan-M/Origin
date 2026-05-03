import type { CreateInvitationDto } from '@origin/shared-types';
import { apiClient } from './client';

// Mirror the Prisma model + included relations returned by the backend.
// Field names match the DB columns (usedAt / usedByAccountId / inviterAccountId).
export interface Invitation {
  id: string;
  token: string;
  inviterAccountId: string;
  targetPersonId: string | null;
  targetPhoneNumber: string | null;
  relationshipHint: string | null;
  usedAt: string | null;
  usedByAccountId: string | null;
  expiresAt: string;
  createdAt: string;
  targetPerson?: { id: string; displayName: string } | null;
  usedByAccount?: { id: string; phoneNumber: string } | null;
}

export interface InvitationCreated extends Invitation {
  /** Shareable invite URL pre-built by the backend (may differ from window.origin). */
  inviteUrl: string;
}

export interface VerifiedInvitation {
  valid: boolean;
  relationshipHint: string | null;
  targetPerson: { id: string; displayName: string } | null;
  /** Echoed back so the receiver's login form can pre-fill their phone. */
  targetPhoneNumber: string | null;
  inviterPhone: string;
  expiresAt: string;
}

export async function createInvitation(dto: CreateInvitationDto): Promise<InvitationCreated> {
  const { data } = await apiClient<InvitationCreated>('/invitations', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function verifyInvitation(token: string): Promise<VerifiedInvitation> {
  const { data } = await apiClient<VerifiedInvitation>(
    `/invitations/verify/${token}`,
    { skipAuth: true },
  );
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
