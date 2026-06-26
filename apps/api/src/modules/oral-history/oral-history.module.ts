import { Module } from '@nestjs/common';
import { OralHistoryService } from './oral-history.service';
import { OralHistoryController } from './oral-history.controller';
import { AuthorizationModule } from '../authorization/authorization.module';

/**
 * Oral history — elders' audio/video testimonies, persisted on the existing
 * Source model.
 *
 * PrismaService and the EventPublisher (global EventingModule) are globally
 * available. AuthorizationModule is imported to reuse VisibilityGuard.evaluate
 * for visibility-aware listing. The service is exported so feed / search seams
 * can build on it.
 */
@Module({
  imports: [AuthorizationModule],
  providers: [OralHistoryService],
  controllers: [OralHistoryController],
  exports: [OralHistoryService],
})
export class OralHistoryModule {}
