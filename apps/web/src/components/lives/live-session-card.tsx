'use client';

import Link from 'next/link';
import {
  BookOpen,
  CalendarClock,
  Mic2,
  PlayCircle,
  Radio,
  Sparkles,
  Users,
  Users2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LiveSession, LiveSessionKind } from '@/lib/api/live';
import {
  useLiveKindLabel,
  useLivesLocale,
  useLiveStatusLabel,
  useLivesT,
} from './lives-i18n';

interface LiveSessionCardProps {
  session: LiveSession;
}

const KIND_ICONS: Record<LiveSessionKind, LucideIcon> = {
  CEREMONY: Sparkles,
  FAMILY_COUNCIL: Users2,
  LESSON: BookOpen,
  STORYTELLING: Mic2,
  MASTERCLASS: BookOpen,
  OTHER: Radio,
};

export function LiveSessionCard({ session }: LiveSessionCardProps) {
  const t = useLivesT();
  const kindLabel = useLiveKindLabel();
  const statusLabel = useLiveStatusLabel();
  const locale = useLivesLocale();

  const isLive = session.status === 'LIVE';
  const isScheduled = session.status === 'SCHEDULED';
  const isEnded = session.status === 'ENDED';
  const hasReplay = isEnded && session.replayPublished && !!session.recordingMediaId;
  const KindIcon = KIND_ICONS[session.kind];

  const when = session.scheduledAt
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(session.scheduledAt))
    : null;

  const count =
    typeof session.participantCount === 'number' ? session.participantCount : 0;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-shadow hover:shadow-md',
        isLive && 'ring-1 ring-terracotta/40',
      )}
    >
      {/* Left status accent */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          isLive && 'bg-terracotta',
          isScheduled && 'bg-ochre',
          isEnded && 'bg-charcoal/20',
        )}
      />
      <CardContent className="flex items-start justify-between gap-4 p-4 pl-5">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {isLive ? (
              <Badge variant="destructive" className="gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                {t('live')}
              </Badge>
            ) : (
              <Badge
                variant={isScheduled ? 'secondary' : 'outline'}
                className="gap-1"
              >
                {statusLabel(session.status)}
              </Badge>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-medium text-charcoal/55">
              <KindIcon className="h-3.5 w-3.5" />
              {kindLabel(session.kind)}
            </span>
          </div>

          <h3 className="truncate text-base font-semibold text-charcoal">
            {session.title}
          </h3>

          {session.hostDisplayName && (
            <p className="truncate text-sm text-charcoal/60">
              {t('hostedBy')} {session.hostDisplayName}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal/55">
            {when && !isLive && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                {t('scheduledFor')} {when}
              </span>
            )}
            {count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {count}{' '}
                {count === 1 ? t('participants_one') : t('participants_other')}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 self-center">
          {isLive && (
            <Button asChild size="sm">
              <Link href={`/lives/${session.id}`}>
                <Radio className="h-4 w-4" />
                {t('join')}
              </Link>
            </Button>
          )}
          {isScheduled && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/lives/${session.id}`}>{t('joinOpen')}</Link>
            </Button>
          )}
          {hasReplay && (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/lives/${session.id}`}>
                <PlayCircle className="h-4 w-4" />
                {t('watchReplay')}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
