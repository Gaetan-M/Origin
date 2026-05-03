'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useT } from '@/i18n';
import {
  banAccount,
  changeRole,
  getAccount,
  listAccountAuditTrail,
  listAccountContributions,
  listAccounts,
  restoreAccount,
  softDeleteAccount,
  unbanAccount,
  updateAccount,
  type AdminAccountListParams,
  type ChangeRoleDto,
  type UpdateAccountDto,
} from '@/lib/api/admin-accounts';

const ROOT_KEY = ['admin', 'accounts'] as const;

export function useAccounts(filters: AdminAccountListParams) {
  return useQuery({
    queryKey: [...ROOT_KEY, 'list', filters],
    queryFn: () => listAccounts(filters),
    placeholderData: (prev) => prev,
  });
}

export function useAccount(id: string | undefined) {
  return useQuery({
    queryKey: [...ROOT_KEY, 'detail', id],
    queryFn: () => getAccount(id as string),
    enabled: Boolean(id),
  });
}

export function useAccountContributions(id: string | undefined, page: number, limit = 10) {
  return useQuery({
    queryKey: [...ROOT_KEY, 'contributions', id, page, limit],
    queryFn: () => listAccountContributions(id as string, { page, limit }),
    enabled: Boolean(id),
    placeholderData: (prev) => prev,
  });
}

export function useAccountAuditTrail(id: string | undefined, page: number, limit = 10) {
  return useQuery({
    queryKey: [...ROOT_KEY, 'audit', id, page, limit],
    queryFn: () => listAccountAuditTrail(id as string, { page, limit }),
    enabled: Boolean(id),
    placeholderData: (prev) => prev,
  });
}

function useInvalidateAccounts() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ROOT_KEY });
  };
}

export function useUpdateAccount(id: string) {
  const invalidate = useInvalidateAccounts();
  const t = useT();
  return useMutation({
    mutationFn: (dto: UpdateAccountDto) => updateAccount(id, dto),
    onSuccess: () => {
      invalidate();
      toast.success(t('admin.accounts.toasts.updated'));
    },
    onError: () => {
      toast.error(t('admin.common.errorGeneric'));
    },
  });
}

export function useChangeRole(id: string) {
  const invalidate = useInvalidateAccounts();
  const t = useT();
  return useMutation({
    mutationFn: (dto: ChangeRoleDto) => changeRole(id, dto),
    onSuccess: () => {
      invalidate();
      toast.success(t('admin.accounts.toasts.roleChanged'));
    },
    onError: () => {
      toast.error(t('admin.common.errorGeneric'));
    },
  });
}

export function useBanAccount(id: string) {
  const invalidate = useInvalidateAccounts();
  const t = useT();
  return useMutation({
    mutationFn: (reason: string) => banAccount(id, reason),
    onSuccess: () => {
      invalidate();
      toast.success(t('admin.accounts.toasts.banned'));
    },
    onError: () => {
      toast.error(t('admin.common.errorGeneric'));
    },
  });
}

export function useUnbanAccount(id: string) {
  const invalidate = useInvalidateAccounts();
  const t = useT();
  return useMutation({
    mutationFn: () => unbanAccount(id),
    onSuccess: () => {
      invalidate();
      toast.success(t('admin.accounts.toasts.unbanned'));
    },
    onError: () => {
      toast.error(t('admin.common.errorGeneric'));
    },
  });
}

export function useDeleteAccount(id: string) {
  const invalidate = useInvalidateAccounts();
  const t = useT();
  return useMutation({
    mutationFn: (reason: string) => softDeleteAccount(id, reason),
    onSuccess: () => {
      invalidate();
      toast.success(t('admin.accounts.toasts.deleted'));
    },
    onError: () => {
      toast.error(t('admin.common.errorGeneric'));
    },
  });
}

export function useRestoreAccount(id: string) {
  const invalidate = useInvalidateAccounts();
  const t = useT();
  return useMutation({
    mutationFn: () => restoreAccount(id),
    onSuccess: () => {
      invalidate();
      toast.success(t('admin.accounts.toasts.restored'));
    },
    onError: () => {
      toast.error(t('admin.common.errorGeneric'));
    },
  });
}
