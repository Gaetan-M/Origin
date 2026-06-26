'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import {
  ConnectionQuality,
  type Participant,
  RoomEvent,
  Track,
} from 'livekit-client';
import '@livekit/components-styles';
import { Radio, WifiOff, X } from 'lucide-react';
import { useLivesT } from './lives-i18n';

interface LiveRoomProps {
  token: string;
  serverUrl: string;
  /** Called when the participant leaves or is disconnected. */
  onLeave: () => void;
}

/**
 * Minimal, audio-first LiveKit room. Camera is OFF by default; per-participant
 * adaptive quality is handled by LiveKit natively, and on a measured poor
 * connection we auto-drop the LOCAL camera and surface a non-blocking banner
 * (the call is NEVER frozen). All decisions are bandwidth-driven, never by age.
 */
export function LiveRoom({ token, serverUrl, onLeave }: LiveRoomProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      // AUDIO-FIRST: mic on, camera off by default.
      audio
      video={false}
      // Per-participant adaptive subscription: only what fits the bandwidth.
      options={{ adaptiveStream: true, dynacast: true }}
      onDisconnected={onLeave}
      data-lk-theme="default"
      className="flex h-full min-h-[60vh] flex-col rounded-xl bg-charcoal/95"
    >
      <RoomAudioRenderer />
      <WeakConnectionGuard />
      <Stage />
      <div className="border-t border-white/10">
        <ControlBar
          variation="minimal"
          controls={{
            microphone: true,
            camera: true,
            screenShare: false,
            chat: false,
            leave: true,
          }}
        />
      </div>
    </LiveKitRoom>
  );
}

/** Camera/screen-share grid; falls back to an audio-live placeholder. */
function Stage() {
  const t = useLivesT();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true },
  );

  if (tracks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-white/80">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <Radio className="h-8 w-8 animate-pulse" />
        </span>
        <p className="text-base font-medium">{t('audioLive')}</p>
        <p className="max-w-xs text-sm text-white/50">{t('audioLiveHint')}</p>
      </div>
    );
  }

  return (
    <GridLayout tracks={tracks} className="flex-1">
      <ParticipantTile />
    </GridLayout>
  );
}

/**
 * Watches the LOCAL participant's connection quality. On a Poor reading it
 * turns the camera off (saving uplink) and shows a non-blocking banner with a
 * one-tap re-enable. It never blocks audio or the rest of the UI.
 */
function WeakConnectionGuard() {
  const t = useLivesT();
  const room = useRoomContext();
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    const handler = (quality: ConnectionQuality, participant: Participant) => {
      if (!participant.isLocal) return;
      if (quality === ConnectionQuality.Poor) {
        // Drop the camera; keep audio flowing.
        if (room.localParticipant.isCameraEnabled) {
          void room.localParticipant.setCameraEnabled(false);
        }
        setDegraded(true);
      }
    };

    room.on(RoomEvent.ConnectionQualityChanged, handler);
    return () => {
      room.off(RoomEvent.ConnectionQualityChanged, handler);
    };
  }, [room]);

  const reEnable = useCallback(() => {
    void room.localParticipant.setCameraEnabled(true);
    setDegraded(false);
  }, [room]);

  if (!degraded) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-ochre px-4 py-2 text-sm text-charcoal">
      <span className="flex min-w-0 items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span className="truncate">{t('weakConnection')}</span>
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={reEnable}
          className="rounded-md bg-charcoal/90 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-charcoal"
        >
          {t('reEnableCamera')}
        </button>
        <button
          type="button"
          onClick={() => setDegraded(false)}
          aria-label="Dismiss"
          className="rounded-md p-1 hover:bg-black/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
