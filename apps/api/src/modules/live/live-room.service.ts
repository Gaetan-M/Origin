import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RoomServiceClient,
  type ParticipantInfo,
  TrackType,
  DataPacket_Kind,
} from 'livekit-server-sdk';

/**
 * Live presence of a single participant as reported by the LiveKit server,
 * reduced to the fields the host roster needs. `identity` is the account id we
 * baked into the join token, so it joins 1:1 with our LiveParticipant rows.
 */
export interface RoomPresence {
  identity: string;
  /** Whether the participant currently publishes at least one (audio) track. */
  publishing: boolean;
  /** Server-side joinedAt (epoch seconds), when known. */
  joinedAt: number | null;
}

/**
 * Server-side LiveKit room control, gated on credentials EXACTLY like
 * {@link LivekitTokenService}: when any of LIVEKIT_API_KEY / LIVEKIT_API_SECRET
 * / LIVEKIT_URL is unset the service is "not configured" — {@link isConfigured}
 * returns false and every control op becomes a no-op that resolves cleanly
 * (returning `false` for "applied to LiveKit"). This keeps host controls usable
 * in dev / un-provisioned environments: the database side-effects (isSpeaker,
 * removal bookkeeping) still happen, only the real-time media effect is skipped.
 *
 * Importing this class (and the SDK) never touches credentials — they are read
 * lazily per call through ConfigService — so the app always builds and boots
 * regardless of whether LiveKit is provisioned. Uses the
 * `livekit-server-sdk` {@link RoomServiceClient} (already a dependency).
 */
@Injectable()
export class LiveRoomService {
  private readonly logger = new Logger(LiveRoomService.name);

  constructor(private readonly config: ConfigService) {}

  /** True only when all three LiveKit credentials are present. */
  isConfigured(): boolean {
    const { apiKey, apiSecret, url } = this.readCredentials();
    return Boolean(apiKey && apiSecret && url);
  }

  /**
   * Force-mute every audio track an identity publishes (host "mute" control).
   * @returns true when the mute was applied to LiveKit, false when not
   *          configured or the participant is not currently in the room.
   */
  async muteAudio(roomName: string, identity: string): Promise<boolean> {
    const client = this.client();
    if (!client) {
      return false;
    }
    try {
      const participant = await client.getParticipant(roomName, identity);
      const audioTracks = (participant.tracks ?? []).filter(
        (t) => t.type === TrackType.AUDIO,
      );
      if (audioTracks.length === 0) {
        return false;
      }
      await Promise.all(
        audioTracks.map((t) =>
          client.mutePublishedTrack(roomName, identity, t.sid, true),
        ),
      );
      return true;
    } catch (err) {
      this.logger.warn(
        `muteAudio failed for ${identity} in ${roomName}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Grant publish rights to a viewer (host "promote to speaker" control). Their
   * client picks up the new permission live and may start its microphone.
   * @returns true when applied to LiveKit, false when not configured / absent.
   */
  async grantPublish(roomName: string, identity: string): Promise<boolean> {
    const client = this.client();
    if (!client) {
      return false;
    }
    try {
      await client.updateParticipant(roomName, identity, undefined, {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
      return true;
    } catch (err) {
      this.logger.warn(
        `grantPublish failed for ${identity} in ${roomName}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Revoke publish rights (host "demote / mute permanently"). Used when removing
   * a speaker back to viewer.
   * @returns true when applied to LiveKit, false otherwise.
   */
  async revokePublish(roomName: string, identity: string): Promise<boolean> {
    const client = this.client();
    if (!client) {
      return false;
    }
    try {
      await client.updateParticipant(roomName, identity, undefined, {
        canPublish: false,
        canSubscribe: true,
        canPublishData: false,
      });
      return true;
    } catch (err) {
      this.logger.warn(
        `revokePublish failed for ${identity} in ${roomName}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Eject a participant from the room (host "remove" control). They may rejoin
   * only if access still permits and the host hasn't otherwise blocked them.
   * @returns true when applied to LiveKit, false otherwise.
   */
  async removeParticipant(roomName: string, identity: string): Promise<boolean> {
    const client = this.client();
    if (!client) {
      return false;
    }
    try {
      await client.removeParticipant(roomName, identity);
      return true;
    } catch (err) {
      this.logger.warn(
        `removeParticipant failed for ${identity} in ${roomName}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Current live presence in the room, keyed by identity. Empty when LiveKit is
   * not configured or the room has not been created yet — callers fall back to
   * the persisted LiveParticipant rows so the roster is never blank.
   */
  async listPresence(roomName: string): Promise<Map<string, RoomPresence>> {
    const presence = new Map<string, RoomPresence>();
    const client = this.client();
    if (!client) {
      return presence;
    }
    try {
      const participants = await client.listParticipants(roomName);
      for (const p of participants) {
        presence.set(p.identity, this.toPresence(p));
      }
    } catch (err) {
      this.logger.warn(
        `listParticipants failed for ${roomName}: ${(err as Error).message}`,
      );
    }
    return presence;
  }

  /**
   * Broadcast a small JSON control payload to the room over LiveKit's data
   * channel (e.g. a "hand raised" signal so every client updates instantly,
   * not just on the next roster poll). Best-effort: never throws.
   */
  async broadcastData(
    roomName: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const client = this.client();
    if (!client) {
      return;
    }
    try {
      const data = new TextEncoder().encode(JSON.stringify(payload));
      await client.sendData(roomName, data, DataPacket_Kind.RELIABLE);
    } catch (err) {
      this.logger.debug(
        `broadcastData failed for ${roomName}: ${(err as Error).message}`,
      );
    }
  }

  // --- internals -----------------------------------------------------------

  private toPresence(p: ParticipantInfo): RoomPresence {
    const publishing = (p.tracks ?? []).some(
      (t) => t.type === TrackType.AUDIO && !t.muted,
    );
    return {
      identity: p.identity,
      publishing,
      joinedAt: p.joinedAt ? Number(p.joinedAt) : null,
    };
  }

  private client(): RoomServiceClient | null {
    const { apiKey, apiSecret, url } = this.readCredentials();
    if (!apiKey || !apiSecret || !url) {
      return null;
    }
    // RoomServiceClient speaks HTTP; LiveKit URLs are usually wss://. Normalise
    // the scheme so a single LIVEKIT_URL serves both the SDK token (wss) and the
    // server API (https) without a second env var.
    const httpUrl = url.replace(/^ws:/i, 'http:').replace(/^wss:/i, 'https:');
    return new RoomServiceClient(httpUrl, apiKey, apiSecret);
  }

  private readCredentials(): {
    apiKey: string | undefined;
    apiSecret: string | undefined;
    url: string | undefined;
  } {
    return {
      apiKey: this.config.get<string>('LIVEKIT_API_KEY'),
      apiSecret: this.config.get<string>('LIVEKIT_API_SECRET'),
      url: this.config.get<string>('LIVEKIT_URL'),
    };
  }
}
