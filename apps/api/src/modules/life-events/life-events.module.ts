import { Module } from '@nestjs/common';
import { LifeEventsController } from './life-events.controller';
import { LifeEventsService } from './life-events.service';
import { AuthorizationModule } from '../authorization/authorization.module';

/**
 * Life-events engine module (S-015/S-016/S-017).
 *
 * Depends on:
 *  - AuthorizationModule (GraphDegreeService / VisibilityGuard) for degree-bounded
 *    FAMILY visibility resolution on life events.
 *  - The eventing module (dev-1) which must provide & export the EVENT_PUBLISHER
 *    token ('EventPublisher'). The integrator wires that import in (see
 *    INTEGRATION NEEDED). If that module is @Global, no extra import is required.
 */
@Module({
  imports: [AuthorizationModule],
  controllers: [LifeEventsController],
  providers: [LifeEventsService],
  exports: [LifeEventsService],
})
export class LifeEventsModule {}
