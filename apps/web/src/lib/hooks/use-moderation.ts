'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AccountRole, ROLE_RANK } from '@origin/shared-types';
import * as moderationApi from '@/lib/api/moderation';
import type { ModerationDecision } from '@/lib/api/moderation';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useModerationT } from '@/components/moderation/moderation-i18n';

const PHOTOS_KEY = ['moderation', 'photos', 'pending'] as const;
const SUGGESTIONS_KEY = ['moderation', 'suggestions', 'pending'] as const;

/**
 * True when the signed-in account holds at least the MODERATOR role. Used to
 * gate the moderation page and its nav entry. Returns false while logged out.
 */
export function useIsModerator(): boolean {
  const account = useAuthStore((s) => s.account);
  if (!account) return false;
  return ROLE_RANK[account.role] >= ROLE_RANK[AccountRole.MODERATOR];
}

/** Pending contributed photos awaiting review (moderators only). */
export function usePendingPhotos() {
  const isModerator = useIsModerator();
  return useQuery({
    queryKey: PHOTOS_KEY,
    queryFn: () => moderationApi.getPendingPhotos(),
    enabled: isModerator,
  });
}

/** Approve / reject a photo, then refresh the queue and toast the outcome. */
export function useModeratePhoto() {
  const queryClient = useQueryClient();
  const t = useModerationT();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: ModerationDecision }) =>
      moderationApi.moderatePhoto(id, decision),
    onSuccess: (_result, { decision }) => {
      queryClient.invalidateQueries({ queryKey: PHOTOS_KEY });
      toast.success(decision === 'APPROVE' ? t('approved') : t('rejected'));
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : undefined;
      toast.error(msg ?? t('actionError'));
    },
  });
}

/** Pending edit-suggestions awaiting review (moderators only). */
export function usePendingSuggestions() {
  const isModerator = useIsModerator();
  return useQuery({
    queryKey: SUGGESTIONS_KEY,
    queryFn: () => moderationApi.getPendingSuggestions(),
    enabled: isModerator,
  });
}

/** Approve / reject a suggestion, then refresh the queue and toast. */
export function useModerateSuggestion() {
  const queryClient = useQueryClient();
  const t = useModerationT();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: ModerationDecision }) =>
      moderationApi.moderateSuggestion(id, decision),
    onSuccess: (_result, { decision }) => {
      queryClient.invalidateQueries({ queryKey: SUGGESTIONS_KEY });
      toast.success(decision === 'APPROVE' ? t('approved') : t('rejected'));
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : undefined;
      toast.error(msg ?? t('actionError'));
    },
  });
}
