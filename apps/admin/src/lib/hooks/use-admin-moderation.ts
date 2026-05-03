'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  approveClaim,
  approveMerge,
  assignVerification,
  disputeClaim,
  getQueueCounts,
  listClaims,
  listIdentityDocuments,
  listMerges,
  listVerifications,
  rejectClaim,
  rejectDocument,
  rejectMerge,
  resolveVerification,
  verifyDocument,
} from '@/lib/api/admin-moderation';
import { useT } from '@/i18n';

const ROOT = ['admin', 'moderation'] as const;

export function useQueueCounts() {
  return useQuery({
    queryKey: [...ROOT, 'queue'],
    queryFn: getQueueCounts,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useClaims(status: string, page: number, limit = 20) {
  return useQuery({
    queryKey: [...ROOT, 'claims', status, page, limit],
    queryFn: () => listClaims({ status, page, limit }),
    placeholderData: (prev) => prev,
  });
}

export function useMerges(page: number, limit = 20) {
  return useQuery({
    queryKey: [...ROOT, 'merges', page, limit],
    queryFn: () => listMerges({ status: 'PENDING', page, limit }),
    placeholderData: (prev) => prev,
  });
}

export function useVerifications(page: number, limit = 20) {
  return useQuery({
    queryKey: [...ROOT, 'verifications', page, limit],
    queryFn: () => listVerifications({ page, limit }),
    placeholderData: (prev) => prev,
  });
}

export function useIdentityDocuments(page: number, limit = 20) {
  return useQuery({
    queryKey: [...ROOT, 'identity-documents', page, limit],
    queryFn: () => listIdentityDocuments({ page, limit }),
    placeholderData: (prev) => prev,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ROOT });
  };
}

export function useApproveClaim() {
  const inv = useInvalidate();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => approveClaim(id, note),
    onSuccess: () => {
      inv();
      toast.success(t('admin.moderation.toasts.approved'));
    },
    onError: () => toast.error(t('admin.common.errorGeneric')),
  });
}

export function useRejectClaim() {
  const inv = useInvalidate();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectClaim(id, reason),
    onSuccess: () => {
      inv();
      toast.success(t('admin.moderation.toasts.rejected'));
    },
    onError: () => toast.error(t('admin.common.errorGeneric')),
  });
}

export function useDisputeClaim() {
  const inv = useInvalidate();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => disputeClaim(id, reason),
    onSuccess: () => {
      inv();
      toast.success(t('admin.moderation.toasts.disputed'));
    },
    onError: () => toast.error(t('admin.common.errorGeneric')),
  });
}

export function useApproveMerge() {
  const inv = useInvalidate();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, keeperPersonId, reason }: { id: string; keeperPersonId: string; reason?: string }) =>
      approveMerge(id, keeperPersonId, reason),
    onSuccess: () => {
      inv();
      toast.success(t('admin.moderation.toasts.approved'));
    },
    onError: () => toast.error(t('admin.common.errorGeneric')),
  });
}

export function useRejectMerge() {
  const inv = useInvalidate();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectMerge(id, reason),
    onSuccess: () => {
      inv();
      toast.success(t('admin.moderation.toasts.rejected'));
    },
    onError: () => toast.error(t('admin.common.errorGeneric')),
  });
}

export function useAssignVerification() {
  const inv = useInvalidate();
  const t = useT();
  return useMutation({
    mutationFn: (id: string) => assignVerification(id),
    onSuccess: () => {
      inv();
      toast.success(t('admin.moderation.toasts.assigned'));
    },
    onError: () => toast.error(t('admin.common.errorGeneric')),
  });
}

export function useResolveVerification() {
  const inv = useInvalidate();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'APPROVED' | 'REJECTED'; note?: string }) =>
      resolveVerification(id, decision, note),
    onSuccess: () => {
      inv();
      toast.success(t('admin.moderation.toasts.resolved'));
    },
    onError: () => toast.error(t('admin.common.errorGeneric')),
  });
}

export function useVerifyDocument() {
  const inv = useInvalidate();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => verifyDocument(id, note),
    onSuccess: () => {
      inv();
      toast.success(t('admin.moderation.toasts.verified'));
    },
    onError: () => toast.error(t('admin.common.errorGeneric')),
  });
}

export function useRejectDocument() {
  const inv = useInvalidate();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectDocument(id, reason),
    onSuccess: () => {
      inv();
      toast.success(t('admin.moderation.toasts.rejected'));
    },
    onError: () => toast.error(t('admin.common.errorGeneric')),
  });
}
