'use client';

import { useMemo } from 'react';
import {
  GridLayout,
  ParticipantTile,
  useParticipants,
  useSpeakingParticipants,
  useTracks,
} from '@livekit/components-react';
import { Track, type Participant } from 'livekit-client';
import {
  Hand,
  MicOff,
  MoreVertical,
  Radio,
  ShieldCheck,
  UserMinus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAvatarColor, getInitials } from '@/lib/utils/format-name';
import { cn } from '@/lib/utils';
import type { HostParticipantAction } from '@/lib/api/live';
import { useLivesT } from './lives-i18n';

interface LiveStageProps {
  isHost: boolean;
  /** Identity of the session host, badged on their tile. */
  hostIdentity: string | null;
  raisedHands: ReadonlySet<string>;
  onHostAction: (identity: string, action: HostParticipantAction) => void;
}

/**
 * The room stage. Audio-first by design: when nobody is sharing video we render
 * warm avatar tiles with live speaking rings, mic state and raised-hand badges.
 * As soon as a camera or screen-share track appears we switch to LiveKit's
 * native video grid (which keeps name + connection chrome).
 */
export function LiveStage({
  isHost,
  hostIdentity,
  raisedHands,
  onHostAction,
}: LiveStageProps) {
  const t = useLivesT();
  const participants = useParticipants();
  const speaking = useSpeakingParticipants();
  const videoTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true },
  );

  const speakingIds = useMemo(
    () => new Set(speaking.map((p) => p.identity)),
    [speaking],
  );

  if (videoTracks.length > 0) {
    return (
      <div className="relative flex-1">
        <GridLayout tracks={videoTracks} className="h-full">
          <ParticipantTile />
        </GridLayout>
      </div>
    );
  }

  if (participants.length === 0) {
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
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {participants.map((p) => (
          <AudioTile
            key={p.identity}
            participant={p}
            speaking={speakingIds.has(p.identity)}
            handRaised={raisedHands.has(p.identity)}
            isSessionHost={hostIdentity === p.identity}
            canModerate={isHost && !p.isLocal}
            onHostAction={onHostAction}
          />
        ))}
      </div>
    </div>
  );
}

interface AudioTileProps {
  participant: Participant;
  speaking: boolean;
  handRaised: boolean;
  isSessionHost: boolean;
  canModerate: boolean;
  onHostAction: (identity: string, action: HostParticipantAction) => void;
}

function AudioTile({
  participant,
  speaking,
  handRaised,
  isSessionHost,
  canModerate,
  onHostAction,
}: AudioTileProps) {
  const t = useLivesT();
  const name = participant.name || participant.identity || '—';
  const muted = !participant.isMicrophoneEnabled;

  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-white/5 p-3 transition-shadow',
        speaking && 'border-ochre/60 shadow-[0_0_0_2px_rgba(217,164,65,0.5)]',
      )}
    >
      {/* Raised hand */}
      {handRaised && (
        <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ochre text-charcoal">
          <Hand className="h-3.5 w-3.5" />
        </span>
      )}

      {/* Host moderation menu */}
      {canModerate && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('hostControls')}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="max-w-[12rem] truncate">
              {name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onHostAction(participant.identity, 'promote')}
            >
              <Volume2 className="h-4 w-4" />
              {t('promote')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onHostAction(participant.identity, 'mute')}
            >
              <VolumeX className="h-4 w-4" />
              {t('muteParticipant')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-[var(--destructive)]"
              onClick={() => onHostAction(participant.identity, 'remove')}
            >
              <UserMinus className="h-4 w-4" />
              {t('removeParticipant')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="relative">
        <span
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold text-white ring-2 ring-transparent transition-all',
            speaking && 'ring-ochre',
          )}
          style={{ backgroundColor: getAvatarColor(participant.identity) }}
        >
          {getInitials(name)}
        </span>
        {muted && (
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal text-white ring-2 ring-charcoal">
            <MicOff className="h-3 w-3" />
          </span>
        )}
      </div>

      <div className="flex min-w-0 max-w-full items-center gap-1">
        {isSessionHost && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-ochre" />}
        <span className="truncate text-xs font-medium text-white/90">
          {participant.isLocal ? t('you') : name}
        </span>
      </div>
    </div>
  );
}
