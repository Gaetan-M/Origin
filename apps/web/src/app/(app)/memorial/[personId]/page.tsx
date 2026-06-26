'use client';

import { use } from 'react';
import { LifeStatus } from '@origin/shared-types';
import { Flame, HeartOff } from 'lucide-react';
import { usePerson } from '@/lib/hooks/use-persons';
import { useTributes, useMemorialSummary } from '@/lib/hooks/use-memorial';
import { useCurrentAccount } from '@/lib/hooks/use-auth';
import { AddTributeForm } from '@/components/memorial/add-tribute-form';
import { TributeWall } from '@/components/memorial/tribute-wall';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { FullPageSpinner } from '@/components/shared/loading-spinner';
import { useLmT } from '@/lib/living-memory-i18n';

export default function MemorialPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = use(params);
  const t = useLmT();
  const { data: person, isLoading: personLoading } = usePerson(personId);
  const { data: tributes, isLoading: tributesLoading } = useTributes(personId);
  const { data: summary } = useMemorialSummary(personId);
  const { data: account } = useCurrentAccount();

  if (personLoading) return <FullPageSpinner />;
  if (!person) return null;

  // Memorial space is only available for deceased persons.
  if (person.lifeStatus !== LifeStatus.DECEASED) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={person.displayName} showBack />
        <EmptyState icon={HeartOff} title={t('memorial.notDeceased')} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="rounded-2xl bg-gradient-to-b from-[#f3efe8] to-[#faf7f2] px-6 py-8 text-center shadow-card">
        <h1 className="font-serif text-2xl text-charcoal">
          {t('memorial.title', { name: person.displayName })}
        </h1>
        <p className="mt-1 text-sm text-charcoal/55">{t('memorial.subtitle')}</p>
        {summary && (
          <div className="mt-4 flex items-center justify-center gap-5 text-sm text-charcoal/60">
            <span className="inline-flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-ochre" />
              {t('memorial.candleCount', { count: summary.candleCount })}
            </span>
            <span>{t('memorial.tributeCount', { count: summary.tributeCount })}</span>
          </div>
        )}
      </header>

      <AddTributeForm personId={personId} />

      {tributesLoading ? (
        <FullPageSpinner />
      ) : (
        <TributeWall
          personId={personId}
          tributes={tributes ?? []}
          currentAccountId={account?.id ?? null}
        />
      )}
    </div>
  );
}
