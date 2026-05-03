import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Locale = 'fr' | 'en';

interface UiState {
  sidebarOpen: boolean;
  locale: Locale;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setLocale: (locale: Locale) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      locale: 'fr',
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ locale: state.locale, sidebarOpen: state.sidebarOpen }),
    },
  ),
);
