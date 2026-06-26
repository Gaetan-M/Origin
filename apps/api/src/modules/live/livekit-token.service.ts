import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

/**
 * Grants requested when minting a LiveKit access token for a participant.
 *
 * `canPublish` is the audio-first/role distinction: hosts and speakers publish,
 * viewers only subscribe. LiveKit handles per-participant adaptive quality
 * natively, so we never encode bandwidth/quality decisions here.
 */
export interface LivekitGrantOptions {
  canPublish: boolean;
  canSubscribe: boolean;
}

/** What a successful mint returns to the caller. */
export interface MintedLivekitToken {
  /** Short-lived JWT the client passes to the LiveKit SDK. */
  token: string;
  /** The LiveKit server URL (wss://...) the client connects to. */
  url: string;
  /** The room the token grants access to. */
  roomName: string;
  /** The participant identity baked into the token. */
  identity: string;
}

/** Default token lifetime — short-lived by design (re-mint on rejoin). */
const TOKEN_TTL = '1h';

/**
 * Mints short-lived LiveKit access tokens, server-side only.
 *
 * GATED on env credentials exactly like the Sentry no-op pattern: when any of
 * LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL is unset the service is
 * "not configured" — {@link isConfigured} returns false and {@link mint} throws
 * a clean {@link ServiceUnavailableException}. Importing this class (and the
 * underlying SDK) never touches credentials, so the app always builds and boots
 * regardless of whether LiveKit is provisioned.
 *
 * Credentials are read through ConfigService (which falls back to process.env),
 * so they are resolved lazily per call — never cached at module load.
 */
@Injectable()
export class LivekitTokenService {
  private readonly logger = new Logger(LivekitTokenService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * True only when all three LiveKit credentials are present. Used by callers
   * to surface a graceful "live not configured" state instead of attempting a
   * mint that would throw.
   */
  isConfigured(): boolean {
    const { apiKey, apiSecret, url } = this.readCredentials();
    return Boolean(apiKey && apiSecret && url);
  }

  /**
   * Mint a LiveKit access token for `identity` to join `roomName` with the
   * given publish/subscribe grants.
   *
   * @throws ServiceUnavailableException when LiveKit is not configured.
   */
  async mint(
    roomName: string,
    identity: string,
    grants: LivekitGrantOptions,
  ): Promise<MintedLivekitToken> {
    const { apiKey, apiSecret, url } = this.readCredentials();
    if (!apiKey || !apiSecret || !url) {
      // Never leak which specific var is missing; just signal "not configured".
      this.logger.warn(
        'LiveKit token requested but credentials are not configured',
      );
      throw new ServiceUnavailableException(
        'Live not configured / Le direct n’est pas configuré',
      );
    }

    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: TOKEN_TTL,
    });
    accessToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: grants.canPublish,
      canSubscribe: grants.canSubscribe,
      // Publishers may also publish track-level data (chat, reactions).
      canPublishData: grants.canPublish,
    });

    // livekit-server-sdk v2 returns a Promise<string> from toJwt().
    const token = await accessToken.toJwt();

    return { token, url, roomName, identity };
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
