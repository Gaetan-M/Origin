'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { DuplicateGroupCard } from '@/components/persons-admin/duplicate-group-card';
import { useDuplicates } from '@/lib/hooks/use-admin-persons';
import { useT } from '@/i18n';

export default function DuplicatesPage() {
  const t = useT();
  const { data, isLoading } = useDuplicates();

  return (
    <>
      <PageHeader
        title={t('admin.persons.duplicates.title')}
        subtitle={t('admin.persons.duplicates.subtitle')}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/persons">
              <ChevronLeft className="h-4 w-4" />
              {t('admin.actions.back')}
            </Link>
          </Button>
        }
      />

      {isLoading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : !data || data.groups.length === 0 ? (
        <EmptyState title={t('admin.persons.duplicates.empty')} />
      ) : (
        <div className="space-y-3">
          {data.groups.map((g, i) => (
            <DuplicateGroupCard key={`${g.key.normalizedName}-${g.key.year ?? 'na'}-${i}`} group={g} />
          ))}
        </div>
      )}
    </>
  );
}
