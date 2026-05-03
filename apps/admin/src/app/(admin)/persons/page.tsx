'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, AlertCircle, Copy } from 'lucide-react';
import { LifeStatus } from '@origin/shared-types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PersonsFilters, DEFAULT_PERSONS_FILTERS, type PersonsFilterValue, type Tri } from '@/components/persons-admin/persons-filters';
import { PersonsTable } from '@/components/persons-admin/persons-table';
import { usePersons } from '@/lib/hooks/use-admin-persons';
import { useT } from '@/i18n';

const PAGE_SIZE = 20;

function triToBool(v: Tri): boolean | undefined {
  if (v === 'yes') return true;
  if (v === 'no') return false;
  return undefined;
}

export default function PersonsPage() {
  const t = useT();
  const [filters, setFilters] = useState<PersonsFilterValue>(DEFAULT_PERSONS_FILTERS);
  const [page, setPage] = useState(1);

  const params = {
    search: filters.search || undefined,
    lifeStatus: filters.lifeStatus === 'ALL' ? undefined : (filters.lifeStatus as LifeStatus),
    hasPhoto: triToBool(filters.hasPhoto),
    hasClaim: triToBool(filters.hasClaim),
    villageOrigin: filters.villageOrigin || undefined,
    region: filters.region || undefined,
    country: filters.country || undefined,
    includeDeleted: filters.includeDeleted || undefined,
    page,
    limit: PAGE_SIZE,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
  };

  const { data, isLoading } = usePersons(params);

  return (
    <>
      <PageHeader
        title={t('admin.persons.title')}
        subtitle={t('admin.persons.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/persons/orphans">
                <AlertCircle className="h-4 w-4" />
                {t('admin.persons.orphans.title')}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/persons/duplicates">
                <Copy className="h-4 w-4" />
                {t('admin.persons.duplicates.title')}
              </Link>
            </Button>
          </div>
        }
      />
      <PersonsFilters value={filters} onChange={(v) => { setFilters(v); setPage(1); }} />
      <div className="mt-4">
        <PersonsTable
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
