import { Module } from '@nestjs/common';
import { AlbumsController } from './albums.controller';
import { AlbumsService } from './albums.service';
import { AuthorizationModule } from '../authorization/authorization.module';

/**
 * Albums module (Phase 4 — Living Memory).
 *
 * Depends on:
 *  - AuthorizationModule -> GraphDegreeService for degree-bounded FAMILY
 *    visibility against an album's subject person.
 *  - PrismaModule (global) for data access.
 *  - The eventing module (@Global) which provides the EventPublisher used to
 *    emit `album.created` / `album.item-added` domain events.
 */
@Module({
  imports: [AuthorizationModule],
  controllers: [AlbumsController],
  providers: [AlbumsService],
  exports: [AlbumsService],
})
export class AlbumsModule {}
