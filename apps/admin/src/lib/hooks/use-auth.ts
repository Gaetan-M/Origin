'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import * as authApi from '@/lib/api/auth';
import { AccountRole } from '@origin/shared-types';
import type { RequestOtpDto, VerifyOtpDto } from '@origin/shared-types';
import { isRoleAtLeast } from '@/lib/utils/role';

export function useRequestOtp() {
  return useMutation({
    mutationFn: (dto: RequestOtpDto) => authApi.requestOtp(dto),
  });
}

/**
 * Verify OTP for the admin console. After getting tokens, we immediately
 * fetch /auth/me to learn the role: anything below MODERATOR is bounced
 * to /forbidden so we never leak admin chrome to a regular user.
 */
export function useVerifyOtp() {
  const { setTokens, setAccount } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (dto: VerifyOtpDto) => authApi.verifyOtp(dto),
    onSuccess: async (tokens) => {
      setTokens(tokens.accessToken, tokens.refreshToken);
      try {
        const account = await authApi.getMe();
        setAccount(account);

        if (!isRoleAtLeast(account.role, AccountRole.MODERATOR)) {
          router.replace('/forbidden');
          return;
        }
        router.replace('/dashboard');
      } catch {
        // The AuthProvider will retry /auth/me; in the meantime we can
        // optimistically land on /dashboard — its layout guard will
        // redirect again once the role is known.
        router.replace('/dashboard');
      }
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

/**
 * Convenience facade used by simple components (e.g. the forbidden
 * page) that just want a `logout()` callback without wiring three
 * hooks together.
 */
export function useAuth() {
  const account = useAuthStore((s) => s.account);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logoutMutation = useLogout();

  return {
    account,
    isAuthenticated,
    logout: () => {
      logoutMutation.mutate(undefined, {
        onSuccess: () => toast.success('Déconnexion réussie'),
      });
    },
    isLoggingOut: logoutMutation.isPending,
  };
}
