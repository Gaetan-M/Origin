import { Module } from '@nestjs/common';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminAccountsService } from './admin-accounts.service';

/**
 * Admin / Accounts surface — list, inspect, edit, role-change, ban,
 * soft-delete and restore user accounts. AdminAuditService is injected
 * from the @Global AdminAuditCoreModule, so no extra imports are needed.
 */
@Module({
  controllers: [AdminAccountsController],
  providers: [AdminAccountsService],
  exports: [AdminAccountsService],
})
export class AdminAccountsModule {}
