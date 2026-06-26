import { Module } from '@nestjs/common';
import { LiveService } from './live.service';
import { LiveController } from './live.controller';
import { LivekitTokenService } from './livekit-token.service';
import { LiveAccessHelper } from './live-access.helper';
import { LiveNotifyHelper } from './live-notify.helper';
import { ReplayService } from './replay/replay.service';
import { LiveKitWebhookController } from './replay/livekit-webhook.controller';
import { AuthorizationModule } from '../authorization/authorization.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * LIVE sessions (Phase 5).
 *
 * PrismaService, the global EventPublisher (EventingModule) and ConfigService
 * are all globally available, so only the AuthorizationModule is imported —
 * for {@link GraphDegreeService} used by the FAMILY-scope degree gate.
 *
 * LiveKit token minting is encapsulated in {@link LivekitTokenService} and is
 * gated on env credentials: importing/registering this module never requires
 * LiveKit to be provisioned. The service is exported so the future replay/media
 * seam can reuse it.
 */
@Module({
  imports: [AuthorizationModule, NotificationsModule],
  providers: [
    LiveService,
    LivekitTokenService,
    LiveAccessHelper,
    LiveNotifyHelper,
    ReplayService,
  ],
  controllers: [LiveController, LiveKitWebhookController],
  exports: [LiveService],
})
export class LiveModule {}
