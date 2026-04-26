'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError } from '@/lib/api/client';
import {
  createFamilyCode,
  getMyFamilyCodes,
  revokeFamilyCode,
  redeemFamilyCode,
  type CreateFamilyCodeRequest,
} from '@/lib/api/family-codes';

export function useMyFamilyCodes() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['family-codes', 'mine'],
    queryFn: () => getMyFamilyCodes(),
    enabled: isAuthenticated,
  });
}

export function useCreateFamilyCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFamilyCodeRequest) => createFamilyCode(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-codes'] });
      toast.success('Code famille genere !');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Impossible de generer le code.';
      toast.error(msg);
    },
  });
}

export function useRevokeFamilyCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeFamilyCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-codes'] });
      toast.success('Code revoque.');
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Impossible de revoquer.';
      toast.error(msg);
    },
  });
}

export function useRedeemFamilyCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => redeemFamilyCode(code),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['family-codes'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(`Code accepte ! Tu as rejoint la famille de ${res.generator.displayName}.`);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Code invalide.';
      toast.error(msg);
    },
  });
}
