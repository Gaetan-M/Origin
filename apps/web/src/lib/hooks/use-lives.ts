'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as liveApi from '@/lib/api/live';
import type {
  CreateLiveSessionInput,
  HostParticipantAction,
  InviteToLiveInput,
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

/** Resolve an invite code to its session (join deep-link page). */
export function useLiveByCode(code: string | null) {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: [LIVES_KEY, 'by-code', code],
    queryFn: () => liveApi.getLiveSessionByCode(code as string),
    enabled: isAuthenticated && !!code,
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

/** Start a scheduled session (host). Refreshes the detail + lists. */
export function useStartLiveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => liveApi.startLiveSession(id),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: [LIVES_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [LIVES_KEY, 'detail', session.id] });
    },
  });
}

/** End a live session (host). Refreshes the detail + lists. */
export function useEndLiveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => liveApi.endLiveSession(id),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: [LIVES_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [LIVES_KEY, 'detail', session.id] });
    },
  });
}

/** Toggle the caller's raised hand for a session. */
export function useRaiseHand(id: string) {
  return useMutation({
    mutationFn: (raised: boolean) => liveApi.raiseLiveHand(id, raised),
  });
}

/** Invite relatives and/or phone numbers to a session. */
export function useInviteToLive(id: string) {
  return useMutation({
    mutationFn: (input: InviteToLiveInput) => liveApi.inviteToLive(id, input),
  });
}

/** Host moderation action on a participant (promote / mute / remove). */
export function useHostParticipantAction(id: string) {
  return useMutation({
    mutationFn: ({
      identity,
      action,
    }: {
      identity: string;
      action: HostParticipantAction;
    }) => liveApi.hostParticipantAction(id, identity, action),
  });
}
