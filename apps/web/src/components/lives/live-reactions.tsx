'use client';

import { useCallback, useRef, useState } from 'react';
import { useDataChannel } from '@livekit/components-react';
import {
  LIVE_REACTIONS,
  LIVE_TOPICS,
  createId,
  decodePayload,
  encodePayload,
  type LiveReactionEmoji,
  type ReactionMessage,
} from './live-realtime';
import { useLivesT } from './lives-i18n';

interface FloatingReaction {
  id: string;
  emoji: LiveReactionEmoji;
  /** Horizontal anchor in percent (0–100). */
  left: number;
  /** Animation duration in ms. */
  duration: number;
  /** Sideways drift in px applied via CSS var. */
  drift: number;
}

/**
 * Emoji reactions: a compact trigger bar plus a full-room floating overlay.
 * Reactions are broadcast over a LiveKit data channel so every participant sees
 * the same bursts rise and fade — purely cosmetic, never persisted.
 *
 * Must render as a direct child of the room's `relative` container so the
 * absolute overlay fills the stage.
 */
export function LiveReactions() {
  const t = useLivesT();
  const [floats, setFloats] = useState<FloatingReaction[]>([]);
  const seq = useRef(0);

  const spawn = useCallback((emoji: LiveReactionEmoji) => {
    const id = `${createId()}-${(seq.current += 1)}`;
    const float: FloatingReaction = {
      id,
      emoji,
      left: 8 + Math.random() * 60,
      duration: 2600 + Math.random() * 1200,
      drift: Math.round((Math.random() - 0.5) * 80),
    };
    setFloats((prev) => [...prev, float]);
    window.setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, float.duration + 100);
  }, []);

  const onMessage = useCallback(
    (msg: { payload: Uint8Array }) => {
      const data = decodePayload<ReactionMessage>(msg.payload);
      if (data && LIVE_REACTIONS.includes(data.emoji)) spawn(data.emoji);
    },
    [spawn],
  );

  const { send } = useDataChannel(LIVE_TOPICS.reactions, onMessage);

  const react = useCallback(
    (emoji: LiveReactionEmoji) => {
      // Optimistic local burst, then fan out to everyone else.
      spawn(emoji);
      const payload: ReactionMessage = { emoji };
      void send(encodePayload(payload), { reliable: false });
    },
    [send, spawn],
  );

  return (
    <>
      {/* Floating overlay — fills the room, ignores pointer events. */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {floats.map((f) => {
          // CSS custom property drives the per-burst horizontal drift; cast so
          // the non-standard key is accepted by React.CSSProperties.
          const style = {
            left: `${f.left}%`,
            animation: `origin-reaction-float ${f.duration}ms cubic-bezier(0.22,0.61,0.36,1) forwards`,
            '--origin-drift': `${f.drift}px`,
          } as React.CSSProperties;
          return (
            <span
              key={f.id}
              className="absolute bottom-2 select-none text-2xl will-change-transform"
              style={style}
            >
              {f.emoji}
            </span>
          );
        })}
      </div>

      {/* Trigger bar */}
      <div
        className="pointer-events-auto absolute bottom-3 right-3 z-30 flex items-center gap-1 rounded-full bg-black/45 px-1.5 py-1 backdrop-blur-sm"
        role="group"
        aria-label={t('reactions')}
      >
        {LIVE_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => react(emoji)}
            aria-label={emoji}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes origin-reaction-float {
          0%   { transform: translate(0, 0) scale(0.6); opacity: 0; }
          12%  { transform: translate(0, -8%) scale(1.1); opacity: 1; }
          100% { transform: translate(var(--origin-drift, 0), -78vh) scale(1.05); opacity: 0; }
        }
      `}</style>
    </>
  );
}
