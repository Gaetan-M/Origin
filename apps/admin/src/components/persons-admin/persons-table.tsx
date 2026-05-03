'use client';

import { useRouter } from 'next/navigation';
import type { AdminPersonRow } from '@/lib/api/admin-persons';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { useT } from '@/i18n';

interface Props {
  data: AdminPersonRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'outline'> = {
  ALIVE: 'success',
  DECEASED: 'secondary',
  UNKNOWN: 'outline',
};

export function PersonsTable({ data, total, page, pageSize, isLoading, onPageChange }: Props) {
  const t = useT();
  const router = useRouter();

  const columns: DataTableColumn<AdminPersonRow>[] = [
    {
      key: 'displayName',
      header: t('admin.persons.columns.displayName'),
      cell: (r) => <span className="font-medium text-charcoal">{r.displayName}</span>,
    },
    {
      key: 'gender',
      header: t('admin.persons.columns.gender'),
      cell: (r) => r.gender ?? '—',
    },
    {
      key: 'lifeStatus',
      header: t('admin.persons.columns.lifeStatus'),
      cell: (r) => (
        <Badge variant={STATUS_VARIANT[r.lifeStatus] ?? 'outline'}>
          {t(`admin.persons.lifeStatus.${r.lifeStatus}`)}
        </Badge>
      ),
    },
    {
      key: 'birthYear',
      header: t('admin.persons.columns.birthYear'),
      cell: (r) => r.birthYearApproximate ?? '—',
    },
    {
      key: 'village',
      header: t('admin.persons.columns.village'),
      cell: (r) => r.villageOrigin ?? '—',
    },
    {
      key: 'region',
      header: t('admin.persons.columns.region'),
      cell: (r) => r.birthRegion ?? '—',
    },
    {
      key: 'claim',
      header: t('admin.persons.columns.claim'),
      cell: (r) => (r.claimCount > 0 ? <Badge variant="info">{r.claimCount}</Badge> : <span className="text-charcoal/40">—</span>),
    },
    {
      key: 'createdAt',
      header: t('admin.persons.columns.createdAt'),
      cell: (r) => <span className="text-xs text-charcoal/60">{formatDate(r.createdAt)}</span>,
    },
  ];

  return (
    <DataTable<AdminPersonRow>
      columns={columns}
      data={data}
      isLoading={isLoading}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      rowKey={(r) => r.id}
      onRowClick={(r) => router.push(`/persons/${r.id}`)}
      emptyState={t('admin.common.empty')}
    />
  );
}
