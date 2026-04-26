'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { getMe } from '@/lib/api/auth';

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
