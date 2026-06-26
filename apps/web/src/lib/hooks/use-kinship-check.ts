'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import * as kinshipApi from '@/lib/api/kinship-check';
import { useAuthStore } from '@/stores/auth-store';

const KINSHIP_CHECKS_KEY = ['kinship-checks'] as const;

/** Incoming + outgoing "Are we related?" checks for the current account. */
export function useKinshipChecks() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: KINSHIP_CHECKS_KEY,
    queryFn: () => kinshipApi.getKinshipChecks(),
    enabled: isAuthenticated,
  });
}

function messageFrom(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Open a new check. Requester consent is implicit; target must still consent. */
export function useInitiateKinshipCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: kinshipApi.InitiateKinshipCheckInput) =>
      kinshipApi.initiateKinshipCheck(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KINSHIP_CHECKS_KEY });
    },
    onError: (err) => {
      toast.error(messageFrom(err, "Impossible d'envoyer la demande."));
    },
  });
}

/**
 * Target consents to a check. Computation happens server-side only after this
 * succeeds; the returned view may already carry the privacy-safe result.
 */
export function useConsentKinshipCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => kinshipApi.consentKinshipCheck(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KINSHIP_CHECKS_KEY });
    },
    onError: (err) => {
      toast.error(messageFrom(err, 'Action impossible pour le moment.'));
    },
  });
}

/** Target declines a check — no computation occurs. */
export function useDeclineKinshipCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => kinshipApi.declineKinshipCheck(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KINSHIP_CHECKS_KEY });
    },
    onError: (err) => {
      toast.error(messageFrom(err, 'Action impossible pour le moment.'));
    },
  });
}

/** Requester withdraws an outgoing check. */
export function useCancelKinshipCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => kinshipApi.cancelKinshipCheck(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KINSHIP_CHECKS_KEY });
    },
    onError: (err) => {
      toast.error(messageFrom(err, 'Action impossible pour le moment.'));
    },
  });
}
