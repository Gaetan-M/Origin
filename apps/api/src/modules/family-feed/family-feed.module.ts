import { Module } from '@nestjs/common';
import { FamilyFeedService } from './family-feed.service';
import { FamilyFeedController } from './family-feed.controller';
import { AuthorizationModule } from '../authorization/authorization.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LifeEventHandler } from './handlers/life-event.handler';
import { ReactionsService } from './engagement/reactions.service';
import { CommentsService } from './engagement/comments.service';
import { ReactionsController } from './engagement/reactions.controller';
import { CommentsController } from './engagement/comments.controller';

/**
 * Degree-bounded private family feed.
 *
 * Depends on AuthorizationModule for GraphDegreeService (FAMILY-scope degree
 * gate) and NotificationsModule for the fan-out handler. PrismaService and the
 * EventPublisher (global EventingModule) are globally available. The service is
 * exported so the life-event fan-out handler can call createPost().
 */
@Module({
  imports: [AuthorizationModule, NotificationsModule],
  providers: [
    FamilyFeedService,
    LifeEventHandler,
    ReactionsService,
    CommentsService,
  ],
  controllers: [FamilyFeedController, ReactionsController, CommentsController],
  exports: [FamilyFeedService],
})
export class FamilyFeedModule {}
