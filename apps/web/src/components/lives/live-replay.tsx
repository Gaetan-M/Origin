'use client';

import { PlayCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { useLiveReplay } from '@/lib/hooks/use-lives';
import { useLivesT } from './lives-i18n';

interface LiveReplayProps {
  sessionId: string;
  /** Whether the session has a published replay to attempt loading. */
  published: boolean;
}

/**
 * Renders the systematic REPLAY of an ended live. Audio-first: an <audio>
 * player for audio recordings, <video> for video. Falls back gracefully when
 * the replay is still being prepared or unavailable.
 */
export function LiveReplay({ sessionId, published }: LiveReplayProps) {
  const t = useLivesT();
  const { data, isLoading, isError } = useLiveReplay(sessionId, published);

  if (!published) {
    return <ReplayNotice text={t('replayPreparing')} />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !data || !data.url) {
    return <ReplayNotice text={t('replayUnavailable')} />;
  }

  if (data.mediaKind === 'AUDIO') {
    return (
      <div className="rounded-xl bg-sand p-6">
        <audio controls preload="metadata" src={data.url} className="w-full">
          <track kind="captions" />
        </audio>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-charcoal">
      <video controls preload="metadata" src={data.url} className="aspect-video w-full">
        <track kind="captions" />
      </video>
    </div>
  );
}

function ReplayNotice({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-sand py-12 text-center">
      <PlayCircle className="h-10 w-10 text-charcoal/30" />
      <p className="max-w-sm text-sm text-charcoal/60">{text}</p>
    </div>
  );
}
