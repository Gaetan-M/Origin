'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as learningApi from '@/lib/api/learning';
import type { LearningLevel } from '@/lib/api/learning';
import { useAuthStore } from '@/stores/auth-store';

const LEARNING_PAGE_SIZE = 12;

export interface LearningFilters {
  languageCode?: string | null;
  level?: LearningLevel | null;
}

/**
 * Infinite, cursor-paginated PUBLIC lessons feed. Language / level filters key
 * the query so switching facets refetches cleanly.
 */
export function useLessons(filters: LearningFilters = {}) {
  const { isAuthenticated } = useAuthStore();
  const { languageCode = null, level = null } = filters;

  return useInfiniteQuery({
    queryKey: ['learning-lessons', languageCode ?? 'ALL', level ?? 'ALL'],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      learningApi.getLessons({
        cursor: pageParam,
        limit: LEARNING_PAGE_SIZE,
        languageCode,
        level,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isAuthenticated,
  });
}

/** Full lesson detail (incl. mini-lesson content + caller's enrollment). */
export function useLesson(id: string | null) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['learning-lesson', id],
    queryFn: () => learningApi.getLesson(id as string),
    enabled: isAuthenticated && Boolean(id),
  });
}

/** Enrol the caller in a lesson; refreshes the lesson detail + list. */
export function useEnrollInLesson(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => learningApi.enrollInLesson(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-lesson', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['learning-lessons'] });
    },
  });
}

/** Update the caller's progress on a lesson (0–100); refreshes the detail. */
export function useUpdateLessonProgress(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (progressPercent: number) =>
      learningApi.updateLessonProgress(lessonId, { progressPercent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-lesson', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['learning-lessons'] });
    },
  });
}
