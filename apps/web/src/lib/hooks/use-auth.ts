'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import * as authApi from '@/lib/api/auth';
import { consumeInvitation } from '@/lib/api/invitations';
import type { RequestOtpDto, VerifyOtpDto } from '@origin/shared-types';

export function useRequestOtp() {
  return useMutation({
    mutationFn: (dto: RequestOtpDto) => authApi.requestOtp(dto),
  });
}

export function useVerifyOtp() {
  const { setTokens, setAccount } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  return useMutation({
    mutationFn: (dto: VerifyOtpDto) => authApi.verifyOtp(dto),
    onSuccess: async (tokens) => {
      setTokens(tokens.accessToken, tokens.refreshToken);
      try {
        const account = await authApi.getMe();
        setAccount(account);
      } catch {
        // account will be fetched by AuthProvider
      }

      // Auto-consume invitation if present
      const inviteToken = searchParams.get('invite');
      if (inviteToken) {
        try {
          await consumeInvitation(inviteToken);
          toast.success('Invitation acceptee !');
        } catch {
          // Non-blocking — invitation may have expired
        }
      }

      // Always land on /dashboard. The (app) layout guard is the single
      // source of truth for the onboarding gate — if the account has no
      // claim yet it will redirect to /onboarding on arrival.
      router.push('/dashboard');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      logout();
      queryClient.clear();
      router.push('/auth/login');
      toast.success('A bientot !');
    },
  });
}

export function useCurrentAccount() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['account', 'me'],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
}
