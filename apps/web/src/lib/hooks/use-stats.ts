'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { getMyStats } from '@/lib/api/accounts';

export function useMyStats() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['account', 'stats'],
    queryFn: () => getMyStats(),
    enabled: isAuthenticated,
    // Stats can take a few queries to compute; cache 30s to avoid hammering
    // the endpoint when the user navigates back to the dashboard.
    staleTime: 30_000,
  });
}
