'use client';

import { use } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { AccountRole, isRoleAtLeast } from '@origin/shared-types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { AuditDetailCard } from '@/components/audit/audit-detail-card';
import { useAuditLog } from '@/lib/hooks/use-admin-audit';
import { useAuthStore } from '@/stores/auth-store';
import { useT } from '@/i18n';

export default function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const { account } = useAuthStore();
  const canRead = isRoleAtLeast((account?.role as AccountRole) ?? AccountRole.USER, AccountRole.ADMIN);
  const { data, isLoading } = useAuditLog(canRead ? id : undefined);

  if (!canRead) {
    return (
      <>
        <PageHeader title={t('admin.audit.title')} />
        <EmptyState title="Accès refusé" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('admin.audit.title')}
        subtitle={data?.action}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/audit">
              <ChevronLeft className="h-4 w-4" />
              {t('admin.actions.back')}
            </Link>
          </Button>
        }
      />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !data ? (
        <EmptyState title={t('admin.common.empty')} />
      ) : (
        <AuditDetailCard entry={data} />
      )}
    </>
  );
}
