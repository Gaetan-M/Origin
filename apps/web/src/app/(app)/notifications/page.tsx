'use client';

import { PageHeader } from '@/components/shared/page-header';
import { NotificationList } from '@/components/notifications/notification-list';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Clock } from 'lucide-react';
import { useT } from '@/i18n';

export default function NotificationsPage() {
  const t = useT();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={t('notifications.title')} />

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inbox" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Clock className="h-4 w-4" />
            Mon activite
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <NotificationList />
        </TabsContent>

        <TabsContent value="activity">
          <RecentActivity />
        </TabsContent>
      </Tabs>
    </div>
  );
}
