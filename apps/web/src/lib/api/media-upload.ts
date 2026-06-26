import { apiClient } from './client';

/**
 * Generic media upload helper for Phase 4 "Living Memory" surfaces (albums,
 * memorial tributes) and the public engagement layer (contributed photos).
 *
 * It uses the DIRECT multipart upload endpoint (`POST /media/upload`), the same
 * path as profile-photo upload — the API persists the bytes server-side and
 * returns the Media row id. We deliberately do NOT use the presigned-URL +
 * S3 PUT flow: object storage is not provisioned in this deployment, so that
 * flow fails (the browser PUT has no reachable bucket). The direct path works
 * everywhere the API runs.
 *
 * The returned id is the media_id that album items / tributes / contributed
 * photos reference.
 */

interface DirectUploadResponse {
  id: string;
  url: string;
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
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', purpose);

  const { data } = await apiClient<DirectUploadResponse>('/media/upload', {
    method: 'POST',
    body: formData,
  });

  return data.id;
}
