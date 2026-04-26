import { apiClient } from './client';

export interface KinshipProbeRequest {
  targetPhoneNumber: string;
  claimedRelationship?: string;
  message?: string;
}

export interface KinshipProbeResponse {
  submitted: boolean;
  message: string;
}

export async function submitKinshipProbe(
  dto: KinshipProbeRequest,
): Promise<KinshipProbeResponse> {
  const { data } = await apiClient<KinshipProbeResponse>('/kinship-probe', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export interface IncomingProbe {
  notificationId: string;
  receivedAt: string;
  message: string | null;
  requester: {
    id: string;
    phoneNumber: string;
    displayName: string | null;
    villageOrigin: string | null;
  };
}

export async function getIncomingProbe(requesterAccountId: string): Promise<IncomingProbe> {
  const { data } = await apiClient<IncomingProbe>(
    `/kinship-probe/incoming/${requesterAccountId}`,
  );
  return data;
}
