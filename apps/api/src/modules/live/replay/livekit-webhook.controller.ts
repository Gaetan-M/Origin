import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { ReplayService } from './replay.service';
import {
  loadLiveKitWebhookReceiver,
  readLiveKitCredentials,
  type LiveKitWebhookEvent,
} from './livekit-webhook.types';

/** Acknowledgement returned to LiveKit for every webhook delivery. */
interface WebhookAck {
  status: 'processed' | 'ignored';
  reason?: string;
}

/**
 * Ingest point for LiveKit egress/recording webhooks.
 *
 * The route is intentionally unauthenticated ({@link Public}) — LiveKit calls
 * it server-to-server and authenticates with an HMAC `Authorization` header
 * verified by the SDK's WebhookReceiver. When LiveKit credentials are unset the
 * platform is "not configured": the endpoint accepts and ignores the payload so
 * the app still builds and boots without LiveKit. We always answer 200 so a
 * single bad/duplicate delivery is never retried into an error storm; the
 * underlying publish is idempotent.
 */
@Controller('live')
export class LiveKitWebhookController {
  private readonly logger = new Logger(LiveKitWebhookController.name);

  constructor(private readonly replayService: ReplayService) {}

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('authorization') authHeader?: string,
  ): Promise<WebhookAck> {
    const credentials = readLiveKitCredentials();
    if (!credentials) {
      // LIVE not configured: accept + ignore so unconfigured environments and
      // the build/boot path never depend on LiveKit.
      return { status: 'ignored', reason: 'live_not_configured' };
    }

    const event = await this.verifyAndDecode(req, authHeader, credentials);
    if (!event) {
      // Verification failed or the SDK is unavailable — acknowledge without
      // acting. Never trust an unverified payload.
      return { status: 'ignored', reason: 'unverified' };
    }

    try {
      await this.replayService.handleWebhookEvent(event);
    } catch (err) {
      // A webhook must still be acknowledged; processing errors are logged and
      // swallowed (the publish is idempotent and can be re-triggered).
      this.logger.error(
        `Error handling LiveKit webhook '${event.event ?? 'unknown'}': ${
          (err as Error).message
        }`,
      );
      return { status: 'ignored', reason: 'processing_error' };
    }

    return { status: 'processed' };
  }

  /**
   * Authenticates and decodes the raw webhook body with the LiveKit SDK. Returns
   * null when the SDK is unavailable or the signature does not verify.
   */
  private async verifyAndDecode(
    req: RawBodyRequest<Request>,
    authHeader: string | undefined,
    credentials: { apiKey: string; apiSecret: string },
  ): Promise<LiveKitWebhookEvent | null> {
    const receiver = await loadLiveKitWebhookReceiver(
      credentials.apiKey,
      credentials.apiSecret,
    );
    if (!receiver) {
      this.logger.warn(
        'livekit-server-sdk unavailable; cannot verify webhook signature',
      );
      return null;
    }

    // The SDK verifies the HMAC over the EXACT raw bytes, so we must hand it the
    // unparsed body. This requires `rawBody: true` on the Nest app (see
    // INTEGRATION NEEDED); without it req.rawBody is undefined and verification
    // correctly fails closed.
    const rawBody = req.rawBody?.toString('utf8');
    if (!rawBody) {
      this.logger.warn(
        'Raw webhook body unavailable; enable rawBody on the Nest app to verify LiveKit webhooks',
      );
      return null;
    }

    try {
      const decoded = await receiver.receive(rawBody, authHeader);
      return decoded as LiveKitWebhookEvent;
    } catch (err) {
      this.logger.warn(
        `LiveKit webhook verification failed: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
