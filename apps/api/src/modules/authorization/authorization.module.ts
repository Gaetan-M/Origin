import { Module } from '@nestjs/common';
import { GraphDegreeService } from './graph-degree.service';
import { VisibilityGuard } from './visibility.guard';

/**
 * Centralised authorization backbone for the visibility model.
 *
 * Exports the GraphDegreeService (family-graph degree computation) and the
 * VisibilityGuard (scope + degree enforcement). PrismaService is provided
 * globally via PrismaModule; ConfigService via the global ConfigModule;
 * Reflector by Nest core — so no extra imports are needed here.
 *
 * The guard is intentionally NOT bound globally (no APP_GUARD). Consumers
 * opt in per route with `@UseGuards(JwtAuthGuard, VisibilityGuard)` plus a
 * `@VisibilityTarget(...)` extractor.
 */
@Module({
  providers: [GraphDegreeService, VisibilityGuard],
  exports: [GraphDegreeService, VisibilityGuard],
})
export class AuthorizationModule {}
