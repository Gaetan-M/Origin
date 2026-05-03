'use client';

import { useRouter } from 'next/navigation';
import type { AdminAccount, AccountRole } from '@origin/shared-types';
import { DataTable } from '@/components/ui/data-table';
import { RoleBadge } from '@/components/shared/role-badge';
import { formatDate, formatDateTime, formatPhone } from '@/lib/format';
import { useT } from '@/i18n';
import { AccountActionsMenu } from './account-actions-menu';

interface AccountsTableProps {
  data: AdminAccount[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  currentUserRole: AccountRole;
  currentUserId: string;
}

function statusFor(account: AdminAccount, t: ReturnType<typeof useT>): {
  label: string;
  className: string;
} {
  if (account.deletedAt) {
    return {
      label: t('admin.accounts.status.deleted'),
      className: 'bg-muted text-muted-foreground',
    };
  }
  if (account.isBanned) {
    return {
      label: t('admin.accounts.status.banned'),
      className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    };
  }
  return {
    label: t('admin.accounts.status.active'),
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  };
}

export function AccountsTable({
  data,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  currentUserRole,
  currentUserId,
}: AccountsTableProps) {
  const router = useRouter();
  const t = useT();

  const columns = [
    {
      key: 'phoneNumber',
      header: t('admin.accounts.columns.phone'),
      sortable: true,
      cell: (row: AdminAccount) => (
        <span className="font-mono text-sm">{formatPhone(row.phoneNumber)}</span>
      ),
    },
    {
      key: 'fullName',
      header: t('admin.accounts.columns.fullName'),
      sortable: true,
      cell: (row: AdminAccount) => row.fullName ?? '—',
    },
    {
      key: 'role',
      header: t('admin.accounts.columns.role'),
      sortable: true,
      cell: (row: AdminAccount) => <RoleBadge role={row.role} />,
    },
    {
      key: 'status',
      header: t('admin.accounts.columns.status'),
      cell: (row: AdminAccount) => {
        const s = statusFor(row, t);
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}
          >
            {s.label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: t('admin.accounts.columns.createdAt'),
      sortable: true,
      cell: (row: AdminAccount) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'lastLoginAt',
      header: t('admin.accounts.columns.lastLogin'),
      sortable: true,
      cell: (row: AdminAccount) => (
        <span className="text-sm text-muted-foreground">
          {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('admin.accounts.columns.actions'),
      cell: (row: AdminAccount) => (
        <div onClick={(e) => e.stopPropagation()}>
          <AccountActionsMenu
            account={row}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={onSortChange}
      onRowClick={(row: AdminAccount) => router.push(`/accounts/${row.id}`)}
    />
  );
}
