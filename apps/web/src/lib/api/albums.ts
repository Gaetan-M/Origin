import { VisibilityScope } from '@origin/shared-types';
import { apiClient } from './client';

export type AlbumKind = 'PERSONAL' | 'FAMILY' | 'EVENT';

export interface Album {
  id: string;
  subjectPersonId: string | null;
  subjectPersonName: string | null;
  ownerAccountId: string;
  title: string;
  description: string | null;
  kind: AlbumKind;
  coverMediaId: string | null;
  visibilityScope: VisibilityScope;
  visibleMaxDegree: number | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumItem {
  id: string;
  albumId: string;
  mediaId: string;
  caption: string | null;
  /** ISO date (yyyy-mm-dd) the media was captured, when known. */
  takenAt: string | null;
  /** Free-text fuzzy date, e.g. "Été 1998", when an exact date is unknown. */
  takenAtText: string | null;
  position: number;
  createdAt: string;
}

export interface AlbumDetail extends Album {
  items: AlbumItem[];
}

export interface CreateAlbumDto {
  title: string;
  description?: string | null;
  kind?: AlbumKind;
  subjectPersonId?: string | null;
  coverMediaId?: string | null;
  visibilityScope?: VisibilityScope;
  visibleMaxDegree?: number | null;
}

export type UpdateAlbumDto = Partial<CreateAlbumDto>;

export interface CreateAlbumItemDto {
  mediaId: string;
  caption?: string | null;
  takenAt?: string | null;
  takenAtText?: string | null;
  position?: number;
}

export type UpdateAlbumItemDto = Partial<Omit<CreateAlbumItemDto, 'mediaId'>>;

export async function getMyAlbums(): Promise<Album[]> {
  const { data } = await apiClient<Album[]>('/albums/mine');
  return data;
}

export async function getAlbumsByPerson(personId: string): Promise<Album[]> {
  const { data } = await apiClient<Album[]>(`/albums/by-person/${personId}`);
  return data;
}

export async function getAlbum(id: string): Promise<AlbumDetail> {
  const { data } = await apiClient<AlbumDetail>(`/albums/${id}`);
  return data;
}

export async function createAlbum(dto: CreateAlbumDto): Promise<Album> {
  const { data } = await apiClient<Album>('/albums', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function updateAlbum(id: string, dto: UpdateAlbumDto): Promise<Album> {
  const { data } = await apiClient<Album>(`/albums/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function deleteAlbum(id: string): Promise<void> {
  await apiClient(`/albums/${id}`, { method: 'DELETE' });
}

export async function addAlbumItem(
  albumId: string,
  dto: CreateAlbumItemDto,
): Promise<AlbumItem> {
  const { data } = await apiClient<AlbumItem>(`/albums/${albumId}/items`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function updateAlbumItem(
  albumId: string,
  itemId: string,
  dto: UpdateAlbumItemDto,
): Promise<AlbumItem> {
  const { data } = await apiClient<AlbumItem>(`/albums/${albumId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return data;
}

export async function deleteAlbumItem(albumId: string, itemId: string): Promise<void> {
  await apiClient(`/albums/${albumId}/items/${itemId}`, { method: 'DELETE' });
}

export async function reorderAlbumItems(
  albumId: string,
  orderedItemIds: string[],
): Promise<void> {
  await apiClient(`/albums/${albumId}/items/reorder`, {
    method: 'POST',
    body: JSON.stringify({ orderedItemIds }),
  });
}
