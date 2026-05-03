import { Module } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminAuditController } from './admin-audit.controller';
import { AdminAuditReadService } from './admin-audit.service';

/**
 * Wires the read-only `/admin/audit/*` HTTP surface.
 *
 * Distinct from the @Global `AdminAuditCoreModule` (which exports the
 * write-side `AdminAuditService` consumed by every other admin module).
 * Keeping the two separated lets us scope read-side concerns (filters,
 * masking, exports) without re-exporting them across the whole app.
 */
@Module({
  controllers: [AdminAuditController],
  providers: [AdminAuditReadService, PrismaService],
})
export class AdminAuditModule {}
