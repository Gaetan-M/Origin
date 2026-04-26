import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account } from '@origin/shared-types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  account: Account | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setAccount: (account: Account) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      account: null,
      isAuthenticated: false,
      setTokens: (accessToken, refreshToken) => {
        if (typeof document !== 'undefined') {
          // Secure flag is mandatory in HTTPS contexts; we attach it whenever
          // the page itself was served over HTTPS so the cookie cannot leak
          // over plaintext. SameSite=Strict blocks cross-site CSRF replay.
          const secure =
            typeof window !== 'undefined' && window.location.protocol === 'https:'
              ? '; Secure'
              : '';
          document.cookie = `auth-flag=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Strict${secure}`;
        }
        set({ accessToken, refreshToken, isAuthenticated: true });
      },
      setAccount: (account) => set({ account }),
      logout: () => {
        if (typeof document !== 'undefined') {
          const secure =
            typeof window !== 'undefined' && window.location.protocol === 'https:'
              ? '; Secure'
              : '';
          document.cookie = `auth-flag=; path=/; max-age=0; SameSite=Strict${secure}`;
        }
        set({ accessToken: null, refreshToken: null, account: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        account: state.account,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
