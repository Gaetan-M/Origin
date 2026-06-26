'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as culturalApi from '@/lib/api/cultural';
import type {
  CreateCulturalContentInput,
  CulturalContentType,
} from '@/lib/api/cultural';
import { useAuthStore } from '@/stores/auth-store';

const DISCOVER_PAGE_SIZE = 12;

/**
 * Infinite, cursor-paginated PUBLIC discovery feed. Low-data friendly small
 * page size. Optional content-type filter keys the query so switching facets
 * refetches cleanly.
 */
export function useDiscoverFeed(contentType?: CulturalContentType | null) {
  const { isAuthenticated } = useAuthStore();

  return useInfiniteQuery({
    queryKey: ['public-feed', contentType ?? 'ALL'],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      culturalApi.getPublicFeed({
        cursor: pageParam,
        limit: DISCOVER_PAGE_SIZE,
        contentType: contentType ?? null,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isAuthenticated,
  });
}

/** Submit a new cultural-heritage contribution; invalidates the discovery feed. */
export function useCreateCulturalContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCulturalContentInput) =>
      culturalApi.createCulturalContent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-feed'] });
    },
  });
}
