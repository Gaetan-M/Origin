'use client';

import { useMutation } from '@tanstack/react-query';
import { searchPersons, type SearchParams } from '@/lib/api/matching';

export function useSearch() {
  return useMutation({
    mutationFn: (params: SearchParams) => searchPersons(params),
  });
}
