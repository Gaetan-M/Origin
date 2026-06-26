import { Module } from '@nestjs/common';
import { TourismService } from './tourism.service';
import { TourismController } from './tourism.controller';

/**
 * Tourism / heritage places — a PUBLIC vertical of the discovery world.
 *
 * PrismaService (PrismaModule) and AdminAuditService (global
 * AdminAuditCoreModule) are globally available, so no imports are required.
 * The service is exported so the public-feed / discovery seam can surface
 * verified places alongside cultural content.
 */
@Module({
  providers: [TourismService],
  controllers: [TourismController],
  exports: [TourismService],
})
export class TourismModule {}
