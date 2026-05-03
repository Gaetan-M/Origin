'use client';

import { useRouter } from 'next/navigation';
import type { AuditLogRow } from '@/lib/api/admin-audit';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { SeverityBadge } from './severity-badge';
import { formatDateTime } from '@/lib/format';
import { useUiStore } from '@/stores/ui-store';
import { useT } from '@/i18n';
import { Badge } from '@/components/ui/badge';

interface Props {
  data: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function AuditTable({ data, total, page, pageSize, isLoading, onPageChange }: Props) {
  const t = useT();
  const router = useRouter();
  const locale = useUiStore((s) => s.locale);

  const columns: DataTableColumn<AuditLogRow>[] = [
    {
      key: 'createdAt',
      header: t('admin.audit.columns.createdAt'),
      cell: (r) => <span className="font-mono text-xs">{formatDateTime(r.createdAt, locale)}</span>,
    },
    {
      key: 'actor',
      header: t('admin.audit.columns.actor'),
      cell: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs">{r.actor?.phoneNumberMasked ?? '—'}</span>
          {r.actor?.fullName && <span className="text-xs text-charcoal/60">{r.actor.fullName}</span>}
        </div>
      ),
    },
    {
      key: 'action',
      header: t('admin.audit.columns.action'),
      cell: (r) => <span className="font-medium text-charcoal">{r.action}</span>,
    },
    {
      key: 'category',
      header: t('admin.audit.columns.category'),
      cell: (r) => <Badge variant="outline" className="font-mono text-[10px]">{r.category}</Badge>,
    },
    {
      key: 'severity',
      header: t('admin.audit.columns.severity'),
      cell: (r) => <SeverityBadge severity={r.severity} />,
    },
    {
      key: 'target',
      header: t('admin.audit.columns.target'),
      cell: (r) => {
        if (r.targetAccount) {
          return <span className="font-mono text-xs">{r.targetAccount.phoneNumberMasked}</span>;
        }
        if (r.targetEntityType && r.targetEntityId) {
          return (
            <span className="text-xs">
              <Badge variant="outline" className="text-[10px]">{r.targetEntityType}</Badge>{' '}
              <span className="font-mono text-charcoal/60">{r.targetEntityId.slice(0, 8)}</span>
            </span>
          );
        }
        return '—';
      },
    },
  ];

  return (
    <DataTable<AuditLogRow>
      columns={columns}
      data={data}
      isLoading={isLoading}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      rowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/audit/${r.id}`)}
      emptyState={t('admin.common.empty')}
    />
  );
}
