import { apiClient } from './client';

/**
 * Generic media upload helper for Phase 4 "Living Memory" surfaces (albums,
 * memorial tributes). It REUSES the existing media module's presigned-upload
 * flow — it does NOT re-implement storage. The three steps are:
 *   1. ask the API for a presigned upload URL + a Media row id
 *   2. PUT the raw bytes straight to object storage
 *   3. confirm the upload so the Media row is marked usable
 * The returned id is the media_id that album items / tributes reference.
 */

interface UploadUrlResponse {
  uploadUrl: string;
  mediaId: string;
  s3Key: string;
}

interface ConfirmUploadResponse {
  id: string;
  confirmed: boolean;
}

/**
 * Media purposes understood by the backend media module for Living Memory and
 * the public engagement layer (contributed photos on tourism / cultural items).
 */
export type LivingMemoryMediaPurpose =
  | 'ALBUM_MEDIA'
  | 'MEMORIAL_MEDIA'
  | 'CONTRIBUTED_MEDIA';

export async function uploadMediaFile(
  file: File,
  purpose: LivingMemoryMediaPurpose,
): Promise<string> {
  const { data: ticket } = await apiClient<UploadUrlResponse>('/media/upload-url', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, mimeType: file.type, purpose }),
  });

  const putRes = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error('media-upload-failed');
  }

  await apiClient<ConfirmUploadResponse>(`/media/${ticket.mediaId}/confirm`, {
    method: 'POST',
  });

  return ticket.mediaId;
}
