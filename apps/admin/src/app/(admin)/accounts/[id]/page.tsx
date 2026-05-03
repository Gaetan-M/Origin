'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { AccountRole } from '@origin/shared-types';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { AccountDetailCard } from '@/components/accounts/account-detail-card';
import { AccountAuditTrail } from '@/components/accounts/account-audit-trail';
import { AccountActionsMenu } from '@/components/accounts/account-actions-menu';
import { useAccount, useAccountContributions } from '@/lib/hooks/use-admin-accounts';
import { useAuthStore } from '@/stores/auth-store';
import { useT } from '@/i18n';
import { formatDateTime } from '@/lib/format';
import { useUiStore } from '@/stores/ui-store';

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const locale = useUiStore((s) => s.locale);
  const { account: currentUser } = useAuthStore();
  const { data, isLoading } = useAccount(id);
  const [contribPage, setContribPage] = useState(1);
  const { data: contribData, isLoading: contribLoading } = useAccountContributions(id, contribPage, 10);

  if (isLoading) {
    return (
      <>
        <PageHeader title={t('admin.accounts.title')} />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader title={t('admin.accounts.title')} />
        <EmptyState title={t('admin.common.empty')} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={data.account.fullName?.trim() || data.account.phoneNumber}
        subtitle={t('admin.accounts.title')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/accounts">
                <ChevronLeft className="h-4 w-4" />
                {t('admin.actions.back')}
              </Link>
            </Button>
            <AccountActionsMenu
              account={data.account}
              currentUserRole={(currentUser?.role as AccountRole) ?? AccountRole.USER}
              currentUserId={currentUser?.id ?? ''}
            />
          </div>
        }
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t('admin.accounts.tabs.profile')}</TabsTrigger>
          <TabsTrigger value="activity">{t('admin.accounts.tabs.activity')}</TabsTrigger>
          <TabsTrigger value="audit">{t('admin.accounts.tabs.audit')}</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <AccountDetailCard detail={data} />
        </TabsContent>
        <TabsContent value="activity" className="mt-6">
          {contribLoading && !contribData ? (
            <Skeleton className="h-64 w-full" />
          ) : !contribData || contribData.items.length === 0 ? (
            <EmptyState title={t('admin.common.empty')} />
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {contribData.items.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-charcoal">{c.action} <span className="text-charcoal/60">· {c.entityType}</span></p>
                    {c.fieldName && <p className="text-xs text-charcoal/60">{c.fieldName}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-charcoal/50">{formatDateTime(c.createdAt, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <AccountAuditTrail accountId={id} />
        </TabsContent>
      </Tabs>
    </>
  );
}
