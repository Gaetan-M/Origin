'use client';

import { useState } from 'react';
import { AccountRole } from '@origin/shared-types';
import { PageHeader } from '@/components/layout/page-header';
import { AccountsFilters, DEFAULT_ACCOUNTS_FILTERS, type AccountsFilterValue } from '@/components/accounts/accounts-filters';
import { AccountsTable } from '@/components/accounts/accounts-table';
import { useAccounts } from '@/lib/hooks/use-admin-accounts';
import { useAuthStore } from '@/stores/auth-store';
import { useT } from '@/i18n';

const PAGE_SIZE = 20;

function triToBool(v: 'all' | 'yes' | 'no'): boolean | undefined {
  if (v === 'yes') return true;
  if (v === 'no') return false;
  return undefined;
}

export default function AccountsPage() {
  const t = useT();
  const { account } = useAuthStore();
  const [filters, setFilters] = useState<AccountsFilterValue>(DEFAULT_ACCOUNTS_FILTERS);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const params = {
    search: filters.search || undefined,
    role: filters.role === 'ALL' ? undefined : filters.role,
    isBanned: triToBool(filters.isBanned),
    hasClaim: triToBool(filters.hasClaim),
    includeDeleted: filters.includeDeleted || undefined,
    page,
    limit: PAGE_SIZE,
    sortBy,
    sortOrder,
  };

  const { data, isLoading } = useAccounts(params);

  return (
    <>
      <PageHeader title={t('admin.accounts.title')} subtitle={t('admin.accounts.subtitle')} />

      <AccountsFilters
        value={filters}
        onChange={(v) => {
          setFilters(v);
          setPage(1);
        }}
      />

      <div className="mt-4">
        <AccountsTable
          data={data?.items ?? []}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          isLoading={isLoading}
          onPageChange={setPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(key, order) => {
            setSortBy(key);
            setSortOrder(order);
          }}
          currentUserRole={(account?.role as AccountRole) ?? AccountRole.USER}
          currentUserId={account?.id ?? ''}
        />
      </div>
    </>
  );
}
