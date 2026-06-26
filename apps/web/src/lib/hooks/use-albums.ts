'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as albumsApi from '@/lib/api/albums';
import { uploadMediaFile } from '@/lib/api/media-upload';
import { useLmT } from '@/lib/living-memory-i18n';

export function useMyAlbums() {
  return useQuery({
    queryKey: ['albums', 'mine'],
    queryFn: () => albumsApi.getMyAlbums(),
  });
}

export function useAlbumsByPerson(personId: string | undefined) {
  return useQuery({
    queryKey: ['albums', 'by-person', personId],
    queryFn: () => albumsApi.getAlbumsByPerson(personId!),
    enabled: !!personId,
  });
}

export function useAlbum(id: string | undefined) {
  return useQuery({
    queryKey: ['albums', id],
    queryFn: () => albumsApi.getAlbum(id!),
    enabled: !!id,
  });
}

export function useCreateAlbum() {
  const queryClient = useQueryClient();
  const t = useLmT();
  return useMutation({
    mutationFn: (dto: albumsApi.CreateAlbumDto) => albumsApi.createAlbum(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(t('albums.created'));
    },
    onError: () => toast.error(t('common.error')),
  });
}

export function useUpdateAlbum(id: string) {
  const queryClient = useQueryClient();
  const t = useLmT();
  return useMutation({
    mutationFn: (dto: albumsApi.UpdateAlbumDto) => albumsApi.updateAlbum(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
    },
    onError: () => toast.error(t('common.error')),
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();
  const t = useLmT();
  return useMutation({
    mutationFn: (id: string) => albumsApi.deleteAlbum(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(t('albums.deleted'));
    },
    onError: () => toast.error(t('common.error')),
  });
}

/**
 * Uploads a file via the existing media module, then creates the album item
 * referencing the returned media_id. Files are never re-implemented here.
 */
export function useAddAlbumItem(albumId: string) {
  const queryClient = useQueryClient();
  const t = useLmT();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      caption?: string | null;
      takenAt?: string | null;
      takenAtText?: string | null;
    }) => {
      const mediaId = await uploadMediaFile(input.file, 'ALBUM_MEDIA');
      return albumsApi.addAlbumItem(albumId, {
        mediaId,
        caption: input.caption ?? null,
        takenAt: input.takenAt ?? null,
        takenAtText: input.takenAtText ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums', albumId] });
      queryClient.invalidateQueries({ queryKey: ['albums', 'mine'] });
      toast.success(t('albums.item.added'));
    },
    onError: () => toast.error(t('common.error')),
  });
}

export function useDeleteAlbumItem(albumId: string) {
  const queryClient = useQueryClient();
  const t = useLmT();
  return useMutation({
    mutationFn: (itemId: string) => albumsApi.deleteAlbumItem(albumId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums', albumId] });
      toast.success(t('albums.item.removed'));
    },
    onError: () => toast.error(t('common.error')),
  });
}
