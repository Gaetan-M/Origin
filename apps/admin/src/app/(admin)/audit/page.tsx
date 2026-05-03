'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { AccountRole, isRoleAtLeast, AdminActionSeverity } from '@origin/shared-types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { AuditFilters, DEFAULT_AUDIT_FILTERS, type AuditFilterValue } from '@/components/audit/audit-filters';
import { AuditTable } from '@/components/audit/audit-table';
import { useAuditLogs } from '@/lib/hooks/use-admin-audit';
import { exportAuditLogs } from '@/lib/api/admin-audit';
import { useAuthStore } from '@/stores/auth-store';
import { useT } from '@/i18n';

const PAGE_SIZE = 50;

export default function AuditPage() {
  const t = useT();
  const { account } = useAuthStore();
  const [filters, setFilters] = useState<AuditFilterValue>(DEFAULT_AUDIT_FILTERS);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const userRole = (account?.role as AccountRole) ?? AccountRole.USER;
  const canRead = isRoleAtLeast(userRole, AccountRole.ADMIN);
  const canExport = isRoleAtLeast(userRole, AccountRole.SUPER_ADMIN);

  const params = canRead
    ? {
        actorAccountId: filters.actorAccountId || undefined,
        targetAccountId: filters.targetAccountId || undefined,
        category: filters.category === 'ALL' ? undefined : filters.category,
        severity: filters.severity === 'ALL' ? undefined : (filters.severity as AdminActionSeverity),
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page,
        limit: PAGE_SIZE,
      }
    : {};

  const { data, isLoading } = useAuditLogs(canRead ? params : { page: 1, limit: 1 });

  const onExport = async (): Promise<void> => {
    if (!canExport) return;
    if (!filters.dateFrom || !filters.dateTo) {
      toast.error('Renseignez une plage de dates pour exporter.');
      return;
    }
    setExporting(true);
    try {
      const blob = await exportAuditLogs(filters.dateFrom, filters.dateTo);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-audit-${filters.dateFrom}-${filters.dateTo}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('admin.audit.exportStarted'));
    } catch {
      toast.error(t('admin.common.errorGeneric'));
    } finally {
      setExporting(false);
    }
  };

  if (!canRead) {
    return (
      <>
        <PageHeader title={t('admin.audit.title')} />
        <EmptyState title="Accès refusé" description="Le journal d'audit est réservé aux administrateurs." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('admin.audit.title')}
        subtitle={t('admin.audit.subtitle')}
        actions={
          canExport ? (
            <Button variant="outline" size="sm" onClick={onExport} disabled={exporting}>
              <Download className="h-4 w-4" />
              {t('admin.audit.export')}
            </Button>
          ) : undefined
        }
      />
      <AuditFilters value={filters} onChange={(v) => { setFilters(v); setPage(1); }} />
      <div className="mt-4">
        <AuditTable
          data={data?.items ?? []}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
