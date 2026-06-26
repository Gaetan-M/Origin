'use client';

/**
 * Realtime message contracts exchanged over LiveKit data channels inside a live
 * room. Everything is best-effort and ephemeral — durable side-effects (raise
 * hand notifications, invitations, moderation) always go through the REST API.
 *
 * We keep three independent topics so each panel subscribes only to what it
 * needs and payloads stay tiny (important on low-bandwidth links):
 *   - reactions: floating emoji bursts
 *   - chat:      live text chat
 *   - presence:  raised-hand toggles surfaced on participant tiles
 */

export const LIVE_TOPICS = {
  reactions: 'origin.reactions',
  chat: 'origin.chat',
  presence: 'origin.presence',
} as const;

/** The curated reaction palette — warm, ceremony-friendly. */
export const LIVE_REACTIONS = ['❤️', '🙏', '👏', '🎉'] as const;
export type LiveReactionEmoji = (typeof LIVE_REACTIONS)[number];

export interface ReactionMessage {
  emoji: LiveReactionEmoji;
}

export interface ChatMessage {
  /** Client-generated id so React keys stay stable across renders. */
  id: string;
  /** Display name of the sender (resolved from the LiveKit identity). */
  from: string;
  text: string;
  /** Epoch ms — formatted client-side in the viewer's locale. */
  at: number;
}

export interface PresenceMessage {
  raised: boolean;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodePayload(value: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(value));
}

export function decodePayload<T>(payload: Uint8Array): T | null {
  try {
    return JSON.parse(decoder.decode(payload)) as T;
  } catch {
    return null;
  }
}

/** Stable-ish id without pulling in a uuid dependency. */
export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
