'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ControlBar,
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useRoomContext,
} from '@livekit/components-react';
import {
  ConnectionQuality,
  type Participant,
  RoomEvent,
} from 'livekit-client';
import '@livekit/components-styles';
import { toast } from 'sonner';
import {
  Hand,
  Hand as HandIcon,
  MessageCircle,
  Radio,
  UserPlus,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HostParticipantAction } from '@/lib/api/live';
import {
  useEndLiveSession,
  useHostParticipantAction,
  useRaiseHand,
} from '@/lib/hooks/use-lives';
import { useLivesT } from './lives-i18n';
import { LiveStage } from './live-stage';
import { LiveReactions } from './live-reactions';
import { LiveChat } from './live-chat';
import { LiveHostPanel } from './live-host-panel';
import { InviteDialog } from './invite-dialog';
import { useLivePresence } from './use-live-presence';

interface LiveRoomProps {
  token: string;
  serverUrl: string;
  sessionId: string;
  /** Whether the current account hosts this session. */
  isHost: boolean;
  /** LiveKit identity of the host (its account id), badged on the tile. */
  hostIdentity: string | null;
  /** Shareable invite code for the invite dialog. */
  inviteCode: string | null;
  /** Called when the participant leaves or is disconnected. */
  onLeave: () => void;
}

/**
 * Full multi-participant live room: audio-first tiles with presence + speaking,
 * realtime reactions and chat over data channels, raise-hand, an invite flow,
 * and host moderation controls. Camera is OFF by default and auto-drops on a
 * weak uplink — the call is never frozen.
 */
export function LiveRoom({
  token,
  serverUrl,
  sessionId,
  isHost,
  hostIdentity,
  inviteCode,
  onLeave,
}: LiveRoomProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video={false}
      options={{ adaptiveStream: true, dynacast: true }}
      onDisconnected={onLeave}
      data-lk-theme="default"
      className="relative flex h-full min-h-[60vh] flex-col overflow-hidden rounded-xl bg-charcoal/95"
    >
      <RoomAudioRenderer />
      <RoomLayout
        sessionId={sessionId}
        isHost={isHost}
        hostIdentity={hostIdentity}
        inviteCode={inviteCode}
        onLeave={onLeave}
      />
    </LiveKitRoom>
  );
}

interface RoomLayoutProps {
  sessionId: string;
  isHost: boolean;
  hostIdentity: string | null;
  inviteCode: string | null;
  onLeave: () => void;
}

function RoomLayout({
  sessionId,
  isHost,
  hostIdentity,
  inviteCode,
  onLeave,
}: RoomLayoutProps) {
  const t = useLivesT();
  const participants = useParticipants();
  const presence = useLivePresence();

  const [chatOpen, setChatOpen] = useState(false);
  const [hostPanelOpen, setHostPanelOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);

  const raiseHandMut = useRaiseHand(sessionId);
  const hostActionMut = useHostParticipantAction(sessionId);
  const endMut = useEndLiveSession();

  const handRaised = presence.handRaised;
  const raisedCount = presence.raisedHands.size;

  const onRaiseHand = useCallback(() => {
    const nowRaised = presence.toggleHand();
    // Best-effort persistence so the host is notified even if the ping is lost.
    raiseHandMut.mutate(nowRaised);
  }, [presence, raiseHandMut]);

  const onHostAction = useCallback(
    (identity: string, action: HostParticipantAction) => {
      hostActionMut.mutate(
        { identity, action },
        {
          onSuccess: () => {
            if (action !== 'mute') presence.clearHand(identity);
            toast.success(t('actionDone'));
          },
          onError: () => toast.error(t('actionFailed')),
        },
      );
    },
    [hostActionMut, presence, t],
  );

  const onEnd = useCallback(() => {
    endMut.mutate(sessionId, { onSuccess: onLeave });
  }, [endMut, onLeave, sessionId]);

  return (
    <>
      <WeakConnectionGuard />

      {/* Top bar */}
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-2 py-0.5 text-xs font-bold text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          {t('live')}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-white/70">
          <Users className="h-3.5 w-3.5" />
          {participants.length}
        </span>
        {isHost && (
          <span className="hidden text-xs text-white/45 sm:inline">
            · {t('youHost')}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {isHost && (
            <ToolbarButton
              active={hostPanelOpen}
              onClick={() => setHostPanelOpen((v) => !v)}
              label={t('raisedHands')}
              badge={raisedCount > 0 ? raisedCount : undefined}
            >
              <HandIcon className="h-4 w-4" />
            </ToolbarButton>
          )}
          <ToolbarButton
            onClick={() => setInviteOpen(true)}
            label={t('invite')}
          >
            <UserPlus className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={chatOpen}
            onClick={() => setChatOpen((v) => !v)}
            label={t('chat')}
          >
            <MessageCircle className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      {/* Stage + overlays */}
      <div className="relative flex flex-1 overflow-hidden">
        <LiveStage
          isHost={isHost}
          hostIdentity={hostIdentity}
          raisedHands={presence.raisedHands}
          onHostAction={onHostAction}
        />
        <LiveReactions />
        <LiveChat open={chatOpen} onClose={() => setChatOpen(false)} />
        {isHost && (
          <LiveHostPanel
            open={hostPanelOpen}
            onClose={() => setHostPanelOpen(false)}
            raisedHands={presence.raisedHands}
            onHostAction={onHostAction}
          />
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-2 py-1.5">
        <ControlBar
          variation="minimal"
          controls={{
            microphone: true,
            camera: true,
            screenShare: isHost,
            chat: false,
            leave: true,
          }}
        />

        <button
          type="button"
          onClick={onRaiseHand}
          aria-pressed={handRaised}
          className={cn(
            'ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
            handRaised
              ? 'bg-ochre text-charcoal'
              : 'bg-white/10 text-white hover:bg-white/20',
          )}
        >
          <Hand className="h-4 w-4" />
          <span className="hidden sm:inline">
            {handRaised ? t('lowerHand') : t('raiseHand')}
          </span>
        </button>

        {isHost &&
          (endConfirm ? (
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={onEnd}
                disabled={endMut.isPending}
                className="rounded-full bg-error px-3 py-2 text-sm font-semibold text-white"
              >
                {endMut.isPending ? t('ending') : t('endLiveConfirm')}
              </button>
              <button
                type="button"
                onClick={() => setEndConfirm(false)}
                aria-label={t('cancel')}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setEndConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-error hover:text-white"
            >
              <Radio className="h-4 w-4" />
              <span className="hidden sm:inline">{t('endLive')}</span>
            </button>
          ))}
      </div>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        sessionId={sessionId}
        inviteCode={inviteCode}
      />
    </>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  label: string;
  active?: boolean;
  badge?: number;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  label,
  active,
  badge,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-white text-charcoal'
          : 'bg-white/10 text-white hover:bg-white/20',
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
      {badge !== undefined && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ochre px-1 text-[10px] font-bold text-charcoal">
          {badge}
        </span>
      )}
    </button>
  );
}

/**
 * Watches the LOCAL participant's connection quality. On a Poor reading it turns
 * the camera off (saving uplink) and shows a non-blocking banner with one-tap
 * re-enable. It never blocks audio or the rest of the UI.
 */
function WeakConnectionGuard() {
  const t = useLivesT();
  const room = useRoomContext();
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    const handler = (quality: ConnectionQuality, participant: Participant) => {
      if (!participant.isLocal) return;
      if (quality === ConnectionQuality.Poor) {
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
