import { Module } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { EngagementController } from './engagement.controller';

/**
 * Engagement layer — polymorphic reactions / comments / contributed photos /
 * ratings / edit-suggestions over the PUBLIC discovery entities (tourism places
 * + cultural content).
 *
 * PrismaService (PrismaModule) is globally available, so no imports are required.
 */
@Module({
  providers: [EngagementService],
  controllers: [EngagementController],
  exports: [EngagementService],
})
export class EngagementModule {}
