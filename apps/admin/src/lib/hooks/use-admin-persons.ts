'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  deletePerson,
  forceMerge,
  getPerson,
  listDuplicates,
  listOrphans,
  listPersons,
  restorePerson,
  updatePerson,
  type AdminPersonsListParams,
  type AdminUpdatePersonDto,
} from '@/lib/api/admin-persons';
import { useT } from '@/i18n';

const ROOT = ['admin', 'persons'] as const;

export function usePersons(filters: AdminPersonsListParams) {
  return useQuery({
    queryKey: [...ROOT, 'list', filters],
    queryFn: () => listPersons(filters),
    placeholderData: (prev) => prev,
  });
}

export function usePerson(id: string | undefined) {
  return useQuery({
    queryKey: [...ROOT, 'detail', id],
    queryFn: () => getPerson(id as string),
    enabled: Boolean(id),
  });
}

export function useOrphans(page: number, limit = 20) {
  return useQuery({
    queryKey: [...ROOT, 'orphans', page, limit],
    queryFn: () => listOrphans({ page, limit }),
    placeholderData: (prev) => prev,
  });
}

export function useDuplicates() {
  return useQuery({
    queryKey: [...ROOT, 'duplicates'],
    queryFn: listDuplicates,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ROOT });
  };
}

export function useUpdatePerson(id: string) {
  const inv = useInvalidate();
  const t = useT();
  return useMutation({
    mutationFn: (dto: AdminUpdatePersonDto) => updatePerson(id, dto),
    onSuccess: () => {
      inv();
      toast.success(t('admin.persons.toasts.personUpdated'));
    },
    onError: () => toast.error(t('admin.common.errorGeneric')),
  });
}

export function useDeletePerson(id: string) {
  const inv = useInvalidate();
  const t = useT();
  return useMutation({
    mutationFn: (reason: string) => deletePerson(id, reason),
    onSuccess: () => {
      inv();
      toast.success(t('admin.persons.toasts.personDeleted'));
    },
    onError: () => toast.error(t('admin.common.errorGeneric')),
  });
}

export function useRestorePerson(id: string) {
  const inv = useInvalidate();
  const t = useT();
  return useMutation({
    mutationFn: () => restorePerson(id),
    onSuccess: () => {
      inv();
      toast.success(t('admin.persons.toasts.personRestored'));
    },
    onError: () => toast.error(t('admin.common.errorGeneric')),
  });
}

export function useForceMerge() {
  const inv = useInvalidate();
  const t = useT();
  return useMutation({
    mutationFn: ({ keeperPersonId, loserPersonId, reason }: { keeperPersonId: string; loserPersonId: string; reason: string }) =>
      forceMerge(keeperPersonId, loserPersonId, reason),
    onSuccess: () => {
      inv();
      toast.success(t('admin.persons.toasts.mergeDone'));
    },
    onError: () => toast.error(t('admin.common.errorGeneric')),
  });
}
