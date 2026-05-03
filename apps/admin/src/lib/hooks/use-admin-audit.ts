'use client';

import { useQuery } from '@tanstack/react-query';
import { getAuditLog, listAuditCategories, listAuditLogs, type ListAuditLogsParams } from '@/lib/api/admin-audit';

const ROOT = ['admin', 'audit'] as const;

export function useAuditLogs(filters: ListAuditLogsParams) {
  return useQuery({
    queryKey: [...ROOT, 'list', filters],
    queryFn: () => listAuditLogs(filters),
    placeholderData: (prev) => prev,
  });
}

export function useAuditLog(id: string | undefined) {
  return useQuery({
    queryKey: [...ROOT, 'detail', id],
    queryFn: () => getAuditLog(id as string),
    enabled: Boolean(id),
  });
}

export function useAuditCategories() {
  return useQuery({
    queryKey: [...ROOT, 'categories'],
    queryFn: listAuditCategories,
    staleTime: 5 * 60_000,
  });
}
