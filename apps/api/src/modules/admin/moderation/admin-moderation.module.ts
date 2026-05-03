import { Module } from '@nestjs/common';
import { AdminModerationController } from './admin-moderation.controller';
import { AdminModerationService } from './admin-moderation.service';

/**
 * Wires the moderation surface of the admin dashboard.
 *
 * AdminAuditService is exposed @Global by AdminAuditCoreModule, so we
 * just inject it from the service — no need to import anything here.
 * PrismaService likewise comes from the global PrismaModule.
 */
@Module({
  controllers: [AdminModerationController],
  providers: [AdminModerationService],
  exports: [AdminModerationService],
})
export class AdminModerationModule {}
