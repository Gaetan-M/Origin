import { Module } from '@nestjs/common';
import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';

/**
 * Language/culture mini-lessons + learner enrollment & progress.
 *
 * Part of the PUBLIC learning world. PrismaService and the EventPublisher
 * (global EventingModule) are globally available, so no extra imports are
 * required. The service is exported so downstream public-feed / moderation
 * modules can reuse it.
 */
@Module({
  providers: [LearningService],
  controllers: [LearningController],
  exports: [LearningService],
})
export class LearningModule {}
