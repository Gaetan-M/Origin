import { Module } from '@nestjs/common';
import { RelationshipsController } from './relationships.controller';
import { RelationshipsService } from './relationships.service';
import { PersonsModule } from '../persons/persons.module';

@Module({
  imports: [PersonsModule],
  controllers: [RelationshipsController],
  providers: [RelationshipsService],
  exports: [RelationshipsService],
})
export class RelationshipsModule {}
