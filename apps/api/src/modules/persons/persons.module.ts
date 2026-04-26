import { Module } from '@nestjs/common';
import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';
import { MatchingModule } from '../matching/matching.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [MatchingModule, MessagingModule],
  controllers: [PersonsController],
  providers: [PersonsService],
  exports: [PersonsService],
})
export class PersonsModule {}
