import { Global, Module } from '@nestjs/common';
import { AdminAuditService } from './admin-audit.service';

/**
 * Global so every admin sub-module can inject AdminAuditService
 * without creating circular dependencies through AdminModule.
 */
@Global()
@Module({
  providers: [AdminAuditService],
  exports: [AdminAuditService],
})
export class AdminAuditCoreModule {}
