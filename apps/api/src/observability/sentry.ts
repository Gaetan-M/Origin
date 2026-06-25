import * as Sentry from '@sentry/node';

/**
 * PII / secret field names that must NEVER be transmitted to Sentry (or any
 * external log sink). Matched case-insensitively against object keys.
 *
 * Scrubbed fields (genealogy/auth sensitive data):
 *  - phone numbers (E.164): phone, phoneNumber, phone_number, msisdn
 *  - national ID / CNI:      cni, cniNumber, cni_number, nationalId, national_id
 *  - one-time codes / PIN:   otp, otpCode, otp_code, pin, pinCode, pin_code
 *  - credentials / tokens:   password, token, accessToken, refreshToken,
 *                            authorization, cookie
 */
const PII_KEYS = new Set([
  'phone',
  'phonenumber',
  'phone_number',
  'msisdn',
  'cni',
  'cninumber',
  'cni_number',
  'nationalid',
  'national_id',
  'otp',
  'otpcode',
  'otp_code',
  'pin',
  'pincode',
  'pin_code',
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
]);

const REDACTED = '[redacted]';

/** Recursively redact PII-keyed values from any structured payload. */
function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = PII_KEYS.has(key.toLowerCase()) ? REDACTED : scrubValue(val);
    }
    return out;
  }
  return value;
}

/**
 * beforeSend scrubber stub — strips PII before any event leaves the process.
 * Generic over the concrete Sentry event type so it satisfies the
 * `beforeSend` signature across @sentry/node versions.
 */
function scrubEvent<T extends Sentry.Event>(event: T): T {
  if (event.request) {
    const headers = event.request.headers as Record<string, unknown> | undefined;
    if (headers) {
      delete headers.authorization;
      delete headers.Authorization;
      delete headers.cookie;
      delete headers.Cookie;
    }
    delete event.request.cookies;
    if (event.request.data !== undefined) {
      event.request.data = scrubValue(event.request.data);
    }
  }
  if (event.extra) {
    event.extra = scrubValue(event.extra) as typeof event.extra;
  }
  return event;
}

/** True when Sentry is configured via SENTRY_DSN. */
export function isSentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}

/**
 * Initialize Sentry error tracking. This is a NO-OP when SENTRY_DSN is absent
 * so local/dev/test (and CI) boot normally without any external dependency on
 * Sentry being reachable. Must be called as early as possible during bootstrap.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // No DSN configured -> do nothing. The app continues to boot normally.
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Release tag if the deploy pipeline injects one (e.g. git SHA on Render).
    release: process.env.SENTRY_RELEASE,
    // Errors only by default — opt into tracing explicitly later if needed.
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
  });
}
