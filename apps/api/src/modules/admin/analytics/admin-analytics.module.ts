import { Module } from '@nestjs/common';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';

/**
 * Admin analytics sub-module.
 *
 * PrismaModule is registered globally, so PrismaService is available
 * to AdminAnalyticsService without an explicit import here. Likewise
 * AdminAuditService comes from AdminAuditCoreModule (also @Global) if
 * future write endpoints need it.
 */
@Module({
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService],
  exports: [AdminAnalyticsService],
})
export class AdminAnalyticsModule {}
