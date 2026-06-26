'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useDataChannel, useLocalParticipant } from '@livekit/components-react';
import {
  LIVE_TOPICS,
  decodePayload,
  encodePayload,
  type PresenceMessage,
} from './live-realtime';

export interface LivePresence {
  /** Set of participant identities currently raising their hand. */
  raisedHands: ReadonlySet<string>;
  /** Whether the LOCAL participant's hand is raised. */
  handRaised: boolean;
  /** Toggle the local hand and broadcast it. Returns the new state. */
  toggleHand: () => boolean;
  /** Force-lower an identity locally (e.g. after the host promotes them). */
  clearHand: (identity: string) => void;
}

/**
 * Tracks raised hands across the room via a presence data channel. Call ONCE at
 * the room level and thread the result down — every message updates a map keyed
 * by the sender's identity, so tiles and the host panel stay in sync.
 */
export function useLivePresence(): LivePresence {
  const { localParticipant } = useLocalParticipant();
  const [raised, setRaised] = useState<ReadonlySet<string>>(new Set());
  const localRaised = useRef(false);

  const onMessage = useCallback(
    (msg: { payload: Uint8Array; from?: { identity: string } }) => {
      const identity = msg.from?.identity;
      if (!identity) return;
      const data = decodePayload<PresenceMessage>(msg.payload);
      if (!data) return;
      setRaised((prev) => {
        const next = new Set(prev);
        if (data.raised) next.add(identity);
        else next.delete(identity);
        return next;
      });
    },
    [],
  );

  const { send } = useDataChannel(LIVE_TOPICS.presence, onMessage);

  const toggleHand = useCallback((): boolean => {
    const nextRaised = !localRaised.current;
    localRaised.current = nextRaised;
    const id = localParticipant.identity;
    setRaised((prev) => {
      const next = new Set(prev);
      if (nextRaised) next.add(id);
      else next.delete(id);
      return next;
    });
    const payload: PresenceMessage = { raised: nextRaised };
    void send(encodePayload(payload), { reliable: true });
    return nextRaised;
  }, [localParticipant.identity, send]);

  const clearHand = useCallback((identity: string) => {
    if (identity === undefined) return;
    setRaised((prev) => {
      if (!prev.has(identity)) return prev;
      const next = new Set(prev);
      next.delete(identity);
      return next;
    });
  }, []);

  const handRaised = raised.has(localParticipant.identity);

  return useMemo(
    () => ({ raisedHands: raised, handRaised, toggleHand, clearHand }),
    [raised, handRaised, toggleHand, clearHand],
  );
}
