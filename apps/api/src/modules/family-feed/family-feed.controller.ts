import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FamilyFeedService, FeedPage } from './family-feed.service';
import { FeedQueryDto } from './dto/feed-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

/**
 * Read API for the degree-bounded private family feed.
 *
 * Visibility is enforced per-post inside the service against the requesting
 * account's claimed person node; this controller only authenticates and
 * paginates. No family-graph data is ever returned.
 */
@ApiTags('Family Feed')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('family-feed')
export class FamilyFeedController {
  constructor(private readonly familyFeedService: FamilyFeedService) {}

  @Get()
  @ApiOperation({
    summary:
      'List family-feed posts visible to the authenticated user (newest first, cursor-paginated)',
  })
  getFeed(
    @CurrentAccount('id') accountId: string,
    @Query() query: FeedQueryDto,
  ): Promise<FeedPage> {
    return this.familyFeedService.getFeedForAccount(accountId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
