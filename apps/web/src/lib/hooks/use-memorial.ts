'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as memorialApi from '@/lib/api/memorial';
import { uploadMediaFile } from '@/lib/api/media-upload';
import { useLmT } from '@/lib/living-memory-i18n';

export function useTributes(personId: string | undefined) {
  return useQuery({
    queryKey: ['memorial', personId, 'tributes'],
    queryFn: () => memorialApi.getTributes(personId!),
    enabled: !!personId,
  });
}

export function useMemorialSummary(personId: string | undefined) {
  return useQuery({
    queryKey: ['memorial', personId, 'summary'],
    queryFn: () => memorialApi.getMemorialSummary(personId!),
    enabled: !!personId,
  });
}

/**
 * Posts a tribute. For PHOTO/VIDEO tributes the optional file is uploaded
 * through the existing media module first, and the resulting media_id is
 * attached. CANDLE/MESSAGE tributes carry no media.
 */
export function useAddTribute(personId: string) {
  const queryClient = useQueryClient();
  const t = useLmT();
  return useMutation({
    mutationFn: async (input: {
      kind: memorialApi.MemorialTributeKind;
      message?: string | null;
      file?: File | null;
      visibilityScope?: memorialApi.CreateTributeDto['visibilityScope'];
    }) => {
      let mediaId: string | null = null;
      if (input.file) {
        mediaId = await uploadMediaFile(input.file, 'MEMORIAL_MEDIA');
      }
      return memorialApi.addTribute(personId, {
        kind: input.kind,
        message: input.message ?? null,
        mediaId,
        visibilityScope: input.visibilityScope,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memorial', personId] });
      toast.success(
        variables.kind === 'CANDLE' ? t('memorial.candleLit') : t('memorial.added'),
      );
    },
    onError: () => toast.error(t('common.error')),
  });
}

export function useDeleteTribute(personId: string) {
  const queryClient = useQueryClient();
  const t = useLmT();
  return useMutation({
    mutationFn: (tributeId: string) => memorialApi.deleteTribute(tributeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memorial', personId] });
      toast.success(t('memorial.tribute.removed'));
    },
    onError: () => toast.error(t('common.error')),
  });
}
