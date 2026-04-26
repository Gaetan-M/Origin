import { Module } from '@nestjs/common';
import { FamilyCodesController } from './family-codes.controller';
import { FamilyCodesService } from './family-codes.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [FamilyCodesController],
  providers: [FamilyCodesService],
})
export class FamilyCodesModule {}
