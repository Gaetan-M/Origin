import { Module } from '@nestjs/common';
import { PublicFeedService } from './public-feed.service';
import { PublicFeedController } from './public-feed.controller';

/**
 * Public cultural-heritage discovery feed (read) + opt-in publish.
 *
 * Deliberately decoupled from the private family world: it depends only on
 * PrismaService (globally available) and reads exclusively APPROVED + PUBLIC
 * cultural content. No AuthorizationModule / GraphDegreeService is wired in
 * because the public feed must never evaluate or expose family-graph data.
 */
@Module({
  providers: [PublicFeedService],
  controllers: [PublicFeedController],
  exports: [PublicFeedService],
})
export class PublicFeedModule {}
