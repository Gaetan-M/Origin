import { apiClient } from './client';

export type MediaPurpose = 'PROFILE_PHOTO' | 'DOCUMENT_SCAN' | 'MEMORIAL_MEDIA';

interface UploadUrlResponse {
  uploadUrl: string;
  mediaId: string;
  s3Key: string;
}

interface ConfirmUploadResponse {
  id: string;
  fileSizeBytes: number | null;
  confirmed: boolean;
}

interface MediaInfo {
  id: string;
  fileType: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  url: string;
  createdAt: string;
}

export async function requestUploadUrl(dto: {
  fileName: string;
  mimeType: string;
  purpose: MediaPurpose;
}): Promise<UploadUrlResponse> {
  const { data } = await apiClient<UploadUrlResponse>('/media/upload-url', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function confirmUpload(mediaId: string): Promise<ConfirmUploadResponse> {
  const { data } = await apiClient<ConfirmUploadResponse>(`/media/${mediaId}/confirm`, { method: 'POST' });
  return data;
}

interface DirectUploadResponse {
  id: string;
  url: string;
  personId: string | null;
  photoYear: number | null;
  isPrimary: boolean;
}

export async function uploadPersonPhoto(
  file: File,
  personId: string,
  opts?: { photoYear?: number; setAsPrimary?: boolean },
): Promise<DirectUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', 'PROFILE_PHOTO');
  formData.append('personId', personId);
  if (opts?.photoYear != null) formData.append('photoYear', String(opts.photoYear));
  if (opts?.setAsPrimary != null)
    formData.append('setAsPrimary', String(opts.setAsPrimary));

  const { data } = await apiClient<DirectUploadResponse>('/media/upload', {
    method: 'POST',
    body: formData,
  });
  return data;
}

export interface PersonPhoto {
  id: string;
  url: string;
  photoYear: number | null;
  isPrimary: boolean;
  createdAt: string;
}

export async function listPersonPhotos(personId: string): Promise<PersonPhoto[]> {
  const { data } = await apiClient<PersonPhoto[]>(`/media/by-person/${personId}`);
  return data;
}

export async function updatePhotoMetadata(
  mediaId: string,
  dto: { photoYear?: number | null; setAsPrimary?: boolean },
): Promise<{ id: string; photoYear: number | null; isPrimary: boolean }> {
  const { data } = await apiClient<{
    id: string;
    photoYear: number | null;
    isPrimary: boolean;
  }>(`/media/${mediaId}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return data;
}

/**
 * Build an absolute URL that streams the raw media bytes. Safe to use as an
 * <img> src — the endpoint is public.
 */
export function getMediaFileUrl(mediaId: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
  return `${base}/media/${mediaId}/file`;
}

export async function getMedia(id: string): Promise<MediaInfo> {
  const { data } = await apiClient<MediaInfo>(`/media/${id}`);
  return data;
}

export async function getPrivateMedia(id: string): Promise<{ url: string; expiresInSeconds: number }> {
  const { data } = await apiClient<{ url: string; expiresInSeconds: number }>(`/media/${id}/private`);
  return data;
}

export async function deleteMedia(id: string): Promise<void> {
  await apiClient(`/media/${id}`, { method: 'DELETE' });
}
