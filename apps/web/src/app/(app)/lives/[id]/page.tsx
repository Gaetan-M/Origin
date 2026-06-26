'use client';

import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Radio } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { LiveReplay } from '@/components/lives/live-replay';
import {
  useLiveKindLabel,
  useLivesT,
} from '@/components/lives/lives-i18n';
import { useLiveSession, useLiveToken } from '@/lib/hooks/use-lives';

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

  const sessionQuery = useLiveSession(id);
  const session = sessionQuery.data;
  const isEnded = session?.status === 'ENDED';

  // Only fetch a join token while the session is (or could be) running. Ended
  // sessions show the replay instead.
  const tokenQuery = useLiveToken(isEnded ? null : id);

  const title = session?.title ?? t('title');

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={title} showBack />

      {session && (
        <div className="flex flex-wrap items-center gap-2 -mt-2">
          <Badge variant="secondary">{kindLabel(session.kind)}</Badge>
          {session.hostDisplayName && (
            <span className="text-sm text-charcoal/60">
              {t('hostedBy')} {session.hostDisplayName}
            </span>
          )}
        </div>
      )}

      {/* Ended -> systematic replay. */}
      {isEnded && id && (
        <LiveReplay sessionId={id} published={!!session?.replayPublished} />
      )}

      {/* Active session -> token gate. */}
      {!isEnded && (
        <LiveStage
          isLoading={sessionQuery.isLoading || tokenQuery.isLoading}
          configured={!!tokenQuery.data?.configured}
          token={tokenQuery.data?.token ?? null}
          serverUrl={tokenQuery.data?.serverUrl ?? null}
          onLeave={() => router.push('/lives')}
        />
      )}
    </div>
  );
}

interface LiveStageProps {
  isLoading: boolean;
  configured: boolean;
  token: string | null;
  serverUrl: string | null;
  onLeave: () => void;
}

function LiveStage({ isLoading, configured, token, serverUrl, onLeave }: LiveStageProps) {
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
    <div className="h-[70vh]">
      <LiveRoom token={token} serverUrl={serverUrl} onLeave={onLeave} />
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
        <h2 className="text-lg font-semibold text-charcoal">{t('comingSoonTitle')}</h2>
        <p className="text-sm text-charcoal/50">{t('comingSoonTitleEn')}</p>
      </div>
      <p className="max-w-sm text-sm text-charcoal/60">{t('comingSoonBody')}</p>
      <Button asChild variant="ghost" size="sm">
        <a href="/lives">{t('backToList')}</a>
      </Button>
    </div>
  );
}
