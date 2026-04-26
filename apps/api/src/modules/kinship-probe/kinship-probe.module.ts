import { Module } from '@nestjs/common';
import { KinshipProbeController } from './kinship-probe.controller';
import { KinshipProbeService } from './kinship-probe.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [KinshipProbeController],
  providers: [KinshipProbeService],
})
export class KinshipProbeModule {}
