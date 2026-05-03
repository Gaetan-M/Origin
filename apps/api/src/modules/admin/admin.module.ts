import { Module } from '@nestjs/common';
import { AdminAuditCoreModule } from './admin-audit.module';
import { AdminAccountsModule } from './accounts/admin-accounts.module';
import { AdminModerationModule } from './moderation/admin-moderation.module';
import { AdminPersonsModule } from './persons/admin-persons.module';
import { AdminAnalyticsModule } from './analytics/admin-analytics.module';
import { AdminAuditModule } from './audit/admin-audit-routes.module';

/**
 * Aggregates every admin-only feature behind a single import.
 *
 * AdminAuditCoreModule is mounted first as @Global so every sub-module
 * can inject AdminAuditService without listing it in their imports.
 */
@Module({
  imports: [
    AdminAuditCoreModule,
    AdminAccountsModule,
    AdminModerationModule,
    AdminPersonsModule,
    AdminAnalyticsModule,
    AdminAuditModule,
  ],
})
export class AdminModule {}
