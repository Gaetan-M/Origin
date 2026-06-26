'use client';

import Link from 'next/link';
import { Radio, PlayCircle, CalendarClock, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LiveSession } from '@/lib/api/live';
import {
  useLiveKindLabel,
  useLivesLocale,
  useLivesT,
} from './lives-i18n';

interface LiveSessionCardProps {
  session: LiveSession;
}

export function LiveSessionCard({ session }: LiveSessionCardProps) {
  const t = useLivesT();
  const kindLabel = useLiveKindLabel();
  const locale = useLivesLocale();

  const isLive = session.status === 'LIVE';
  const isEnded = session.status === 'ENDED';
  const hasReplay = isEnded && session.replayPublished && !!session.recordingMediaId;

  const when = session.scheduledAt
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(session.scheduledAt))
    : null;

  return (
    <Card className={cn('overflow-hidden', isLive && 'ring-1 ring-terracotta/40')}>
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {isLive && (
              <Badge variant="destructive" className="gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                {t('live')}
              </Badge>
            )}
            <Badge variant="secondary">{kindLabel(session.kind)}</Badge>
          </div>

          <h3 className="truncate text-base font-semibold text-charcoal">
            {session.title}
          </h3>

          {session.hostDisplayName && (
            <p className="text-sm text-charcoal/60">
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
            {typeof session.participantCount === 'number' && session.participantCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {session.participantCount}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {isLive && (
            <Button asChild size="sm">
              <Link href={`/lives/${session.id}`}>
                <Radio className="h-4 w-4" />
                {t('join')}
              </Link>
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
