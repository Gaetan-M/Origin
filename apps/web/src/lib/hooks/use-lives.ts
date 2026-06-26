'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as liveApi from '@/lib/api/live';
import type {
  CreateLiveSessionInput,
  LiveSessionStatus,
} from '@/lib/api/live';
import { useAuthStore } from '@/stores/auth-store';

const LIVES_KEY = 'lives';

/** List visible live sessions, optionally filtered by status. */
export function useLiveSessions(status?: LiveSessionStatus | null) {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: [LIVES_KEY, 'list', status ?? 'ALL'],
    queryFn: () => liveApi.listLiveSessions({ status: status ?? null }),
    enabled: isAuthenticated,
    // Lives change state often (SCHEDULED -> LIVE -> ENDED); keep it fresh.
    refetchInterval: 30_000,
  });
}

export function useLiveSession(id: string | null) {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: [LIVES_KEY, 'detail', id],
    queryFn: () => liveApi.getLiveSession(id as string),
    enabled: isAuthenticated && !!id,
  });
}

/**
 * Fetch the join token for a room. Returns the "not configured" envelope
 * gracefully rather than throwing, so the room can degrade. We do not retry
 * aggressively — a missing token is an expected state, not an error.
 */
export function useLiveToken(id: string | null) {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: [LIVES_KEY, 'token', id],
    queryFn: () => liveApi.getLiveToken(id as string),
    enabled: isAuthenticated && !!id,
    retry: false,
    // Tokens are short-lived; do not cache them for long.
    staleTime: 0,
    gcTime: 0,
  });
}

export function useLiveReplay(id: string | null, enabled: boolean) {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: [LIVES_KEY, 'replay', id],
    queryFn: () => liveApi.getLiveReplay(id as string),
    enabled: isAuthenticated && !!id && enabled,
    retry: false,
  });
}

/** Schedule a new live session; invalidates the lists on success. */
export function useCreateLiveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLiveSessionInput) =>
      liveApi.createLiveSession(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LIVES_KEY, 'list'] });
    },
  });
}
