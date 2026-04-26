'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyClaims } from '@/lib/api/claims';
import { useAuthStore } from '@/stores/auth-store';

export function useMyClaims() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['claims', 'mine'],
    queryFn: getMyClaims,
    enabled: isAuthenticated,
  });
}
