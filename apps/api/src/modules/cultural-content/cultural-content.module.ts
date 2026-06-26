import { Module } from '@nestjs/common';
import { CulturalContentService } from './cultural-content.service';
import { CulturalContentController } from './cultural-content.controller';

/**
 * Cultural content authoring + cultural-authority registration.
 *
 * Part of the PUBLIC discovery world. PrismaService and the EventPublisher
 * (global EventingModule) are globally available, so no extra imports are
 * required. The service is exported so downstream public-feed / moderation
 * modules can reuse it.
 */
@Module({
  providers: [CulturalContentService],
  controllers: [CulturalContentController],
  exports: [CulturalContentService],
})
export class CulturalContentModule {}
