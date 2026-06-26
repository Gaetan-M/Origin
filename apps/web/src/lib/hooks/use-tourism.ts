'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tourismApi from '@/lib/api/tourism';
import type {
  SubmitTourismPlaceInput,
  TourismCategory,
} from '@/lib/api/tourism';
import { useAuthStore } from '@/stores/auth-store';

const TOURISM_PAGE_SIZE = 12;

export interface TourismFilters {
  region?: string | null;
  category?: TourismCategory | null;
  verifiedOnly?: boolean;
}

/**
 * Infinite, cursor-paginated PUBLIC tourism-places feed. Low-data friendly
 * small page size. Region / category / verified filters key the query so
 * switching facets refetches cleanly.
 */
export function useTourismPlaces(filters: TourismFilters = {}) {
  const { isAuthenticated } = useAuthStore();
  const { region = null, category = null, verifiedOnly = false } = filters;

  return useInfiniteQuery({
    queryKey: ['tourism', region ?? 'ALL', category ?? 'ALL', verifiedOnly],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      tourismApi.getTourismPlaces({
        cursor: pageParam,
        limit: TOURISM_PAGE_SIZE,
        region,
        category,
        verifiedOnly,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isAuthenticated,
  });
}

/** Submit a community-sourced place; invalidates the tourism feed. */
export function useSubmitTourismPlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitTourismPlaceInput) =>
      tourismApi.submitTourismPlace(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tourism'] });
    },
  });
}
