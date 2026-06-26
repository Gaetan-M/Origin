import { Module } from '@nestjs/common';
import { MemorialController } from './memorial.controller';
import { MemorialService } from './memorial.service';
import { AuthorizationModule } from '../authorization/authorization.module';

/**
 * Memorial tributes module (Phase 4 — Living Memory).
 *
 * Depends on:
 *  - AuthorizationModule — exports VisibilityGuard (reused to filter tribute
 *    collections) and GraphDegreeService for FAMILY degree-bounded access.
 *  - PrismaModule provides PrismaService globally; no extra import needed.
 *
 * The integrator must register MemorialModule in app.module.ts (see
 * INTEGRATION NEEDED).
 */
@Module({
  imports: [AuthorizationModule],
  controllers: [MemorialController],
  providers: [MemorialService],
  exports: [MemorialService],
})
export class MemorialModule {}
