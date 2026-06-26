'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as engagementApi from '@/lib/api/engagement';
import type {
  EngagementReactionType,
  EngagementSummary,
  EngagementTarget,
  ReactionCounts,
  SuggestEditField,
} from '@/lib/api/engagement';
import { uploadMediaFile } from '@/lib/api/media-upload';
import { useAuthStore } from '@/stores/auth-store';

const COMMENTS_PAGE_SIZE = 15;

/** Root query key for one engagement target — used for broad invalidation. */
function targetKey(target: EngagementTarget, id: string): (string | EngagementTarget)[] {
  return ['engagement', target, id];
}

/** Full summary for a detail view (reactions, counts, my reaction, rating). */
export function useEngagementSummary(target: EngagementTarget, id: string | null | undefined) {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: [...targetKey(target, id ?? ''), 'summary'],
    queryFn: () => engagementApi.getEngagementSummary(target, id as string),
    enabled: isAuthenticated && Boolean(id),
  });
}

/** Compact counts for a batch of ids — drives the "alive" strip on cards. */
export function useEngagementBatch(target: EngagementTarget, ids: string[]) {
  const { isAuthenticated } = useAuthStore();
  // Stable, order-independent key so the same visible set hits one cache entry.
  const sortedIds = [...ids].sort();
  return useQuery({
    queryKey: ['engagement', target, 'batch', sortedIds],
    queryFn: () => engagementApi.getEngagementBatch(target, sortedIds),
    enabled: isAuthenticated && sortedIds.length > 0,
  });
}

/**
 * Toggle/replace the caller's reaction with optimistic UI on the summary.
 * Clicking the active reaction clears it; otherwise it is set/replaced.
 */
export function useToggleReaction(target: EngagementTarget, id: string) {
  const queryClient = useQueryClient();
  const summaryKey = [...targetKey(target, id), 'summary'];

  return useMutation({
    mutationFn: (type: EngagementReactionType) => {
      const current = queryClient.getQueryData<EngagementSummary>(summaryKey);
      const isActive = current?.myReaction === type;
      return isActive
        ? engagementApi.clearReaction(target, id)
        : engagementApi.setReaction(target, id, type);
    },
    onMutate: async (type: EngagementReactionType) => {
      await queryClient.cancelQueries({ queryKey: summaryKey });
      const previous = queryClient.getQueryData<EngagementSummary>(summaryKey);
      if (previous) {
        const reactions: ReactionCounts = { ...previous.reactions };
        // Remove the old reaction's contribution.
        if (previous.myReaction) {
          reactions[previous.myReaction] = Math.max(0, reactions[previous.myReaction] - 1);
        }
        const clearing = previous.myReaction === type;
        const nextMine: EngagementReactionType | null = clearing ? null : type;
        if (nextMine) {
          reactions[nextMine] = reactions[nextMine] + 1;
        }
        const totalReactions =
          reactions.LIKE + reactions.LOVE + reactions.WOW + reactions.VISITED;
        queryClient.setQueryData<EngagementSummary>(summaryKey, {
          ...previous,
          reactions,
          totalReactions,
          myReaction: nextMine,
        });
      }
      return { previous };
    },
    onError: (_err, _type, context) => {
      if (context?.previous) {
        queryClient.setQueryData(summaryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: summaryKey });
    },
  });
}

/** Infinite, cursor-paginated comment thread for one target. */
export function useComments(target: EngagementTarget, id: string) {
  const { isAuthenticated } = useAuthStore();
  return useInfiniteQuery({
    queryKey: [...targetKey(target, id), 'comments'],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      engagementApi.getComments(target, id, { cursor: pageParam, limit: COMMENTS_PAGE_SIZE }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isAuthenticated && Boolean(id),
  });
}

export function useAddComment(target: EngagementTarget, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => engagementApi.addComment(target, id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...targetKey(target, id), 'comments'] });
      queryClient.invalidateQueries({ queryKey: [...targetKey(target, id), 'summary'] });
    },
  });
}

export function useDeleteComment(target: EngagementTarget, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => engagementApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...targetKey(target, id), 'comments'] });
      queryClient.invalidateQueries({ queryKey: [...targetKey(target, id), 'summary'] });
    },
  });
}

export function usePhotos(target: EngagementTarget, id: string) {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: [...targetKey(target, id), 'photos'],
    queryFn: () => engagementApi.getPhotos(target, id),
    enabled: isAuthenticated && Boolean(id),
  });
}

/** Uploads the file (CONTRIBUTED_MEDIA) then posts the photo record. */
export function useAddPhoto(target: EngagementTarget, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption?: string }) => {
      const mediaId = await uploadMediaFile(file, 'CONTRIBUTED_MEDIA');
      return engagementApi.addPhoto(target, id, mediaId, caption);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...targetKey(target, id), 'photos'] });
      queryClient.invalidateQueries({ queryKey: [...targetKey(target, id), 'summary'] });
    },
  });
}

export function useRatePlace(target: EngagementTarget, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stars: number) => engagementApi.ratePlace(target, id, stars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...targetKey(target, id), 'summary'] });
    },
  });
}

export function useSuggestEdit(target: EngagementTarget, id: string) {
  return useMutation({
    mutationFn: (input: { field: SuggestEditField; proposedValue: string; note?: string }) =>
      engagementApi.suggestEdit(target, id, input),
  });
}
