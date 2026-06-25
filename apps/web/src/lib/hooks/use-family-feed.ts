'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as feedApi from '@/lib/api/family-feed';
import { useAuthStore } from '@/stores/auth-store';

const FEED_PAGE_SIZE = 15;

/** Infinite, cursor-paginated family feed. Low-data friendly small page size. */
export function useFamilyFeed() {
  const { isAuthenticated } = useAuthStore();

  return useInfiniteQuery({
    queryKey: ['family-feed'],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      feedApi.getFamilyFeed({ cursor: pageParam, limit: FEED_PAGE_SIZE }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isAuthenticated,
  });
}

/** Comment thread for one post — loaded lazily when a card expands its comments. */
export function usePostComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['family-feed', postId, 'comments'],
    queryFn: () => feedApi.getPostComments(postId),
    enabled,
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      reactionType,
      active,
    }: {
      postId: string;
      reactionType: string;
      active: boolean;
    }) =>
      active
        ? feedApi.removeReaction(postId, reactionType)
        : feedApi.addReaction(postId, reactionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-feed'] });
    },
  });
}

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => feedApi.addComment(postId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-feed', postId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['family-feed'] });
    },
  });
}
