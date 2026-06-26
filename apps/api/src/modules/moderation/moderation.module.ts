import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';

/**
 * Phase-2 public-world moderation.
 *
 * PrismaService (PrismaModule) and AdminAuditService (global
 * AdminAuditCoreModule) are globally available, so no imports are needed.
 * The service is exported so other public-world modules (cultural content,
 * feed) can trigger moderation flows directly.
 */
@Module({
  providers: [ModerationService],
  controllers: [ModerationController],
  exports: [ModerationService],
})
export class ModerationModule {}
