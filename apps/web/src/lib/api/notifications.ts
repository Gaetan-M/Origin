import type { Notification, PaginationQuery } from '@origin/shared-types';
import { apiClient } from './client';

export interface PaginatedNotifications {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getNotifications(query?: PaginationQuery): Promise<PaginatedNotifications> {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  // Backend service returns { data, meta } which gets wrapped by interceptor into { data: { data, meta } }
  const { data } = await apiClient<PaginatedNotifications>(`/notifications${qs ? `?${qs}` : ''}`);
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient(`/notifications/${id}/mark-read`, { method: 'POST' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient('/notifications/mark-all-read', { method: 'POST' });
}

export async function getUnreadCount(): Promise<number> {
  // Backend returns { unreadCount: number }
  const { data } = await apiClient<{ unreadCount: number }>('/notifications/unread-count');
  return data.unreadCount;
}
