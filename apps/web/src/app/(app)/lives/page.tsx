'use client';

import Link from 'next/link';
import { Radio, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { LiveSessionCard } from '@/components/lives/live-session-card';
import { useLivesT } from '@/components/lives/lives-i18n';
import { useLiveSessions } from '@/lib/hooks/use-lives';
import type { LiveSession } from '@/lib/api/live';

export default function LivesPage() {
  const t = useLivesT();
  const { data, isLoading, isError, refetch } = useLiveSessions();

  const sessions = data ?? [];
  const liveNow = sessions.filter((s) => s.status === 'LIVE');
  const upcoming = sessions.filter((s) => s.status === 'SCHEDULED');
  const past = sessions.filter((s) => s.status === 'ENDED');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{t('title')}</h1>
          <p className="text-sm text-charcoal/60">{t('subtitle')}</p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/lives/new">
            <Plus className="h-4 w-4" />
            {t('schedule')}
          </Link>
        </Button>
      </header>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {isError && !isLoading && (
        <EmptyState
          icon={Radio}
          title={t('error')}
          actionLabel={t('retry')}
          onAction={() => void refetch()}
        />
      )}

      {!isLoading && !isError && sessions.length === 0 && (
        <EmptyState icon={Radio} title={t('empty')} description={t('emptyHint')} />
      )}

      {!isLoading && !isError && (
        <>
          <Section title={t('sectionLive')} sessions={liveNow} />
          <Section title={t('sectionUpcoming')} sessions={upcoming} />
          <Section title={t('sectionPast')} sessions={past} />
        </>
      )}
    </div>
  );
}

function Section({ title, sessions }: { title: string; sessions: LiveSession[] }) {
  if (sessions.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
        {title}
      </h2>
      <div className="space-y-3">
        {sessions.map((session) => (
          <LiveSessionCard key={session.id} session={session} />
        ))}
      </div>
    </section>
  );
}
