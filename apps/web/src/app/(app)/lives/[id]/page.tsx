'use client';

import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CalendarClock, Radio, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { LiveReplay } from '@/components/lives/live-replay';
import {
  useLiveKindLabel,
  useLivesLocale,
  useLivesT,
} from '@/components/lives/lives-i18n';
import {
  useLiveSession,
  useLiveToken,
  useStartLiveSession,
} from '@/lib/hooks/use-lives';
import { useAuthStore } from '@/stores/auth-store';
import type { LiveSession } from '@/lib/api/live';

// The LiveKit room pulls browser-only modules ('livekit-client',
// '@livekit/components-react'); load it client-side only so SSR never touches
// it and the rest of the page stays renderable.
const LiveRoom = dynamic(
  () => import('@/components/lives/live-room').then((m) => m.LiveRoom),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    ),
  },
);

export default function LiveRoomPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? null;
  const router = useRouter();
  const t = useLivesT();
  const kindLabel = useLiveKindLabel();
  const account = useAuthStore((s) => s.account);

  const sessionQuery = useLiveSession(id);
  const session = sessionQuery.data;
  const isEnded = session?.status === 'ENDED';
  const isScheduled = session?.status === 'SCHEDULED';
  const isHost = !!session && !!account && session.hostAccountId === account.id;

  // Only fetch a join token while the session is (or could be) running. Ended
  // sessions show the replay instead.
  const tokenQuery = useLiveToken(isEnded ? null : id);

  const title = session?.title ?? t('title');

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={title} showBack />

      {session && (
        <div className="-mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{kindLabel(session.kind)}</Badge>
          {session.hostDisplayName && (
            <span className="text-sm text-charcoal/60">
              {t('hostedBy')} {session.hostDisplayName}
            </span>
          )}
          {typeof session.participantCount === 'number' &&
            session.participantCount > 0 && (
              <span className="inline-flex items-center gap-1 text-sm text-charcoal/55">
                <Users className="h-3.5 w-3.5" />
                {session.participantCount}
              </span>
            )}
        </div>
      )}

      {/* Scheduled — pre-room lobby. Host can go live; others wait. */}
      {isScheduled && session && (
        <ScheduledLobby session={session} isHost={isHost} />
      )}

      {/* Ended -> systematic replay. */}
      {isEnded && id && (
        <LiveReplay sessionId={id} published={!!session?.replayPublished} />
      )}

      {/* Active session -> token gate. */}
      {!isEnded && !isScheduled && (
        <LiveStageGate
          isLoading={sessionQuery.isLoading || tokenQuery.isLoading}
          configured={!!tokenQuery.data?.configured}
          token={tokenQuery.data?.token ?? null}
          serverUrl={tokenQuery.data?.serverUrl ?? null}
          sessionId={id ?? ''}
          isHost={isHost}
          hostIdentity={session?.hostAccountId ?? null}
          inviteCode={session?.inviteCode ?? null}
          onLeave={() => router.push('/lives')}
        />
      )}
    </div>
  );
}

function ScheduledLobby({
  session,
  isHost,
}: {
  session: LiveSession;
  isHost: boolean;
}) {
  const t = useLivesT();
  const locale = useLivesLocale();
  const startMut = useStartLiveSession();

  const when = session.scheduledAt
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date(session.scheduledAt))
    : null;

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-sand/60 p-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white">
        <CalendarClock className="h-8 w-8 text-forest" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-charcoal">{session.title}</h2>
        {when && (
          <p className="text-sm text-charcoal/60">
            {t('scheduledFor')} {when}
          </p>
        )}
      </div>
      {session.description && (
        <p className="max-w-sm text-sm text-charcoal/60">{session.description}</p>
      )}
      {isHost && (
        <Button
          onClick={() => startMut.mutate(session.id)}
          disabled={startMut.isPending}
        >
          <Radio className="h-4 w-4" />
          {startMut.isPending ? t('starting') : t('startNow')}
        </Button>
      )}
    </div>
  );
}

interface LiveStageGateProps {
  isLoading: boolean;
  configured: boolean;
  token: string | null;
  serverUrl: string | null;
  sessionId: string;
  isHost: boolean;
  hostIdentity: string | null;
  inviteCode: string | null;
  onLeave: () => void;
}

function LiveStageGate({
  isLoading,
  configured,
  token,
  serverUrl,
  sessionId,
  isHost,
  hostIdentity,
  inviteCode,
  onLeave,
}: LiveStageGateProps) {
  const t = useLivesT();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <LoadingSpinner />
        <p className="text-sm text-charcoal/50">{t('roomLoading')}</p>
      </div>
    );
  }

  // Graceful "coming soon": API says not configured OR no token was minted.
  // The page NEVER crashes — we render a calm, bilingual placeholder.
  if (!configured || !token || !serverUrl) {
    return <ComingSoon />;
  }

  return (
    <div className="h-[72vh]">
      <LiveRoom
        token={token}
        serverUrl={serverUrl}
        sessionId={sessionId}
        isHost={isHost}
        hostIdentity={hostIdentity}
        inviteCode={inviteCode}
        onLeave={onLeave}
      />
    </div>
  );
}

function ComingSoon() {
  const t = useLivesT();
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 rounded-xl bg-sand/60 p-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white">
        <Radio className="h-8 w-8 text-forest" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-charcoal">
          {t('comingSoonTitle')}
        </h2>
        <p className="text-sm text-charcoal/50">{t('comingSoonTitleEn')}</p>
      </div>
      <p className="max-w-sm text-sm text-charcoal/60">{t('comingSoonBody')}</p>
      <Button asChild variant="ghost" size="sm">
        <Link href="/lives">{t('backToList')}</Link>
      </Button>
    </div>
  );
}
