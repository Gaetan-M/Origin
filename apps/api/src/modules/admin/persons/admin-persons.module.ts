import { Module } from '@nestjs/common';
import { AdminPersonsController } from './admin-persons.controller';
import { AdminPersonsService } from './admin-persons.service';

/**
 * Moderator-facing tooling around the Person aggregate (list/edit/delete/
 * restore + orphans, duplicates, force-merge).
 *
 * AdminAuditService is provided by the @Global AdminAuditCoreModule and
 * PrismaService by the global PrismaModule, so no extra imports are
 * needed here.
 */
@Module({
  controllers: [AdminPersonsController],
  providers: [AdminPersonsService],
  exports: [AdminPersonsService],
})
export class AdminPersonsModule {}
