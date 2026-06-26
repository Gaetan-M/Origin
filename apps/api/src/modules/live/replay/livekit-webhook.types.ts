/**
 * LiveKit egress/recording webhook seam — types + optional-dependency loaders.
 *
 * ALL LiveKit usage is gated on env credentials. When LIVEKIT_API_KEY /
 * LIVEKIT_API_SECRET / LIVEKIT_URL are unset, the platform behaves as if LIVE
 * is "not configured": the webhook endpoint accepts and ignores payloads, and
 * the 'livekit-server-sdk' package is never imported. This mirrors the Sentry
 * no-op pattern so the app always builds and boots without the LiveKit SDK or
 * credentials present.
 */

/** Resolved LiveKit credentials, present only when all three env vars are set. */
export interface LiveKitCredentials {
  apiKey: string;
  apiSecret: string;
  url: string;
}

/**
 * Reads LiveKit credentials from the environment. Returns null unless ALL of
 * LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL are present and non-empty,
 * so every caller can branch on a single "configured?" check.
 */
export function readLiveKitCredentials(): LiveKitCredentials | null {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !url) {
    return null;
  }
  return { apiKey, apiSecret, url };
}

/** Single output file produced by a LiveKit egress (recording). */
export interface LiveKitFileResult {
  filename?: string;
  location?: string;
  /** Size in bytes, reported as an int64 string by LiveKit. */
  size?: string | number;
  /** Duration in NANOSECONDS, reported as an int64 string by LiveKit. */
  duration?: string | number;
}

/** Egress payload carried by recording-related LiveKit webhook events. */
export interface LiveKitEgressInfo {
  egressId?: string;
  roomName?: string;
  status?: string;
  fileResults?: LiveKitFileResult[];
  file?: LiveKitFileResult;
}

/**
 * Minimal shape of a verified LiveKit webhook event. Only the fields the replay
 * pipeline consumes are typed; the SDK's full WebhookEvent is a superset.
 */
export interface LiveKitWebhookEvent {
  event?: string;
  egressInfo?: LiveKitEgressInfo;
  room?: { name?: string };
  id?: string;
  createdAt?: number;
}

/**
 * A receiver capable of authenticating + decoding a raw LiveKit webhook body.
 * Structurally matches 'livekit-server-sdk' WebhookReceiver so the concrete SDK
 * type never leaks into our code (and is never required at compile time).
 */
export interface LiveKitWebhookReceiver {
  receive(body: string, authHeader?: string): Promise<unknown>;
}

/**
 * Lazily loads the LiveKit WebhookReceiver, only ever called when credentials
 * are present. The import specifier is a non-literal so the project still
 * type-checks and builds when 'livekit-server-sdk' is not installed; any
 * failure to load resolves to null (verification is then skipped).
 */
export async function loadLiveKitWebhookReceiver(
  apiKey: string,
  apiSecret: string,
): Promise<LiveKitWebhookReceiver | null> {
  try {
    const moduleName = 'livekit-server-sdk';
    const mod = (await import(moduleName)) as unknown as {
      WebhookReceiver?: new (
        apiKey: string,
        apiSecret: string,
      ) => LiveKitWebhookReceiver;
    };
    if (!mod.WebhookReceiver) {
      return null;
    }
    return new mod.WebhookReceiver(apiKey, apiSecret);
  } catch {
    // SDK not installed / failed to load — caller treats this as "cannot verify".
    return null;
  }
}
