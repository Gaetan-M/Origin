'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { getMe } from '@/lib/api/auth';

/**
 * On boot, if we have persisted tokens we re-fetch /auth/me so that the
 * cached `account` (and especially its role) is fresh. A failure (token
 * revoked server-side, account banned, etc.) clears the local session.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, setAccount, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    getMe()
      .then(setAccount)
      .catch(() => {
        logout();
      });
  }, [isAuthenticated, setAccount, logout]);

  return <>{children}</>;
}
