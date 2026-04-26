'use client';

import { useRouter } from 'next/navigation';
import { useMyPersons } from '@/lib/hooks/use-persons';
import { PersonCard } from '@/components/persons/person-card';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import { Users } from 'lucide-react';
import { useT } from '@/i18n';

export default function PersonsPage() {
  const { data: persons, isLoading } = useMyPersons();
  const t = useT();
  const router = useRouter();

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t('persons.myPersons')}
        action={{ label: t('persons.add'), onClick: () => router.push('/persons/new') }}
      />

      {!persons || persons.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('persons.emptyTitle')}
          description={t('persons.emptyDesc')}
          actionLabel={t('persons.add')}
          onAction={() => window.location.href = '/persons/new'}
        />
      ) : (
        <div className="space-y-3">
          {persons.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </div>
  );
}
