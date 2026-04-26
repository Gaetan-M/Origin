'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as invApi from '@/lib/api/invitations';
import { useAuthStore } from '@/stores/auth-store';
import type { CreateInvitationDto } from '@origin/shared-types';

export function useMyInvitations() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['invitations', 'mine'],
    queryFn: () => invApi.getMyInvitations(),
    enabled: isAuthenticated,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateInvitationDto) => invApi.createInvitation(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation envoyee !');
    },
  });
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invApi.deleteInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

export function useVerifyInvitation(token: string | undefined) {
  return useQuery({
    queryKey: ['invitations', 'verify', token],
    queryFn: () => invApi.verifyInvitation(token!),
    enabled: !!token,
  });
}

export function useConsumeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => invApi.consumeInvitation(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation acceptee !');
    },
  });
}
