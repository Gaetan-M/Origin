'use client';

import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Radio,
  Sparkles,
  Users2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { EmptyState } from '@/components/shared/empty-state';
import { LiveSessionCard } from '@/components/lives/live-session-card';
import { useLivesT } from '@/components/lives/lives-i18n';
import { useLiveSessions } from '@/lib/hooks/use-lives';
import type { LiveSession, LiveSessionKind } from '@/lib/api/live';

export default function LivesPage() {
  const t = useLivesT();
  const { data, isLoading, isError, refetch } = useLiveSessions();

  const sessions = data ?? [];
  const liveNow = sessions.filter((s) => s.status === 'LIVE');
  const upcoming = sessions.filter((s) => s.status === 'SCHEDULED');
  const past = sessions.filter((s) => s.status === 'ENDED');
  const isEmpty = !isLoading && !isError && sessions.length === 0;

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

      {isEmpty && <LivesEmptyState />}

      {!isLoading && !isError && !isEmpty && (
        <>
          <Section title={t('sectionLive')} sessions={liveNow} />
          <Section title={t('sectionUpcoming')} sessions={upcoming} />
          <Section title={t('sectionPast')} sessions={past} />
        </>
      )}
    </div>
  );
}

function Section({
  title,
  sessions,
}: {
  title: string;
  sessions: LiveSession[];
}) {
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

interface LiveIdea {
  kind: LiveSessionKind;
  icon: LucideIcon;
  titleKey: 'ideaCeremonyTitle' | 'ideaCouncilTitle' | 'ideaLessonTitle';
  descKey: 'ideaCeremonyDesc' | 'ideaCouncilDesc' | 'ideaLessonDesc';
  accent: string;
}

const IDEAS: LiveIdea[] = [
  {
    kind: 'CEREMONY',
    icon: Sparkles,
    titleKey: 'ideaCeremonyTitle',
    descKey: 'ideaCeremonyDesc',
    accent: 'bg-terracotta/10 text-terracotta',
  },
  {
    kind: 'FAMILY_COUNCIL',
    icon: Users2,
    titleKey: 'ideaCouncilTitle',
    descKey: 'ideaCouncilDesc',
    accent: 'bg-forest/10 text-forest',
  },
  {
    kind: 'LESSON',
    icon: BookOpen,
    titleKey: 'ideaLessonTitle',
    descKey: 'ideaLessonDesc',
    accent: 'bg-ochre/15 text-ochre',
  },
];

function LivesEmptyState() {
  const t = useLivesT();
  return (
    <div className="rounded-2xl border border-charcoal/10 bg-gradient-to-b from-sand/70 to-white p-6 text-center sm:p-8">
      <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-charcoal/5">
        <Radio className="h-8 w-8 text-forest" />
      </span>
      <h2 className="text-lg font-bold text-charcoal">{t('emptyTitle')}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-charcoal/60">
        {t('emptyBody')}
      </p>

      <div className="mt-6 grid gap-2 text-left sm:grid-cols-3">
        {IDEAS.map((idea) => {
          const Icon = idea.icon;
          return (
            <Link
              key={idea.kind}
              href={`/lives/new?kind=${idea.kind}`}
              className="group flex flex-col gap-1.5 rounded-xl border border-charcoal/10 bg-white p-3 transition-colors hover:border-forest/40 hover:bg-sand/40"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${idea.accent}`}
              >
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="text-sm font-semibold text-charcoal">
                {t(idea.titleKey)}
              </span>
              <span className="text-xs leading-snug text-charcoal/55">
                {t(idea.descKey)}
              </span>
            </Link>
          );
        })}
      </div>

      <Button asChild className="mt-6">
        <Link href="/lives/new">
          <Plus className="h-4 w-4" />
          {t('emptyCtaPrimary')}
        </Link>
      </Button>
    </div>
  );
}
