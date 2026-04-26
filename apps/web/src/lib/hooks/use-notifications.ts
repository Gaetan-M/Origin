'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as notifApi from '@/lib/api/notifications';
import { useAuthStore } from '@/stores/auth-store';

export function useNotifications(page = 1, limit = 20) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['notifications', page, limit],
    queryFn: () => notifApi.getNotifications({ page, limit }),
    enabled: isAuthenticated,
  });
}

export function useUnreadCount() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notifApi.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notifApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notifApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
