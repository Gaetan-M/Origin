'use client';

import { useState } from 'react';
import { useNotifications, useMarkRead, useMarkAllRead } from '@/lib/hooks/use-notifications';
import { NotificationItem } from './notification-item';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Bell, CheckCheck } from 'lucide-react';
import { useT } from '@/i18n';

export function NotificationList() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const t = useT();

  const notifications = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const hasMore = notifications.length < total;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return <EmptyState icon={Bell} title={t('notifications.empty')} />;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()}>
          <CheckCheck className="mr-1 h-4 w-4" />
          {t('notifications.markAllRead')}
        </Button>
      </div>

      <div className="space-y-1">
        {notifications.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            onClick={() => {
              if (!n.isRead) markRead.mutate(n.id);
            }}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
            {t('common.seeAll')}
          </Button>
        </div>
      )}
    </div>
  );
}
