import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { MatchOnSignupService } from './match-on-signup.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [MatchingController],
  providers: [MatchingService, MatchOnSignupService],
  exports: [MatchingService, MatchOnSignupService],
})
export class MatchingModule {}
