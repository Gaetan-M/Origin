import { Module } from '@nestjs/common';
import { KinshipCheckController } from './kinship-check.controller';
import { KinshipCheckService } from './kinship-check.service';
import { RelationshipLabelService } from './relationship-label.service';
import { KinshipNotifyHelper } from './kinship-notify.helper';
import { AuthorizationModule } from '../authorization/authorization.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Consent-based, privacy-preserving "Sommes-nous parents ?" feature.
 *
 * - AuthorizationModule provides GraphDegreeService (the relationship engine).
 * - NotificationsModule notifies the target (consent request) and both parties
 *   (result ready).
 * - PrismaService and EventPublisher are provided globally.
 */
@Module({
  imports: [AuthorizationModule, NotificationsModule],
  controllers: [KinshipCheckController],
  providers: [KinshipCheckService, RelationshipLabelService, KinshipNotifyHelper],
  exports: [KinshipCheckService],
})
export class KinshipCheckModule {}
