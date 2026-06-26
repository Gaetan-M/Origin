import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  PublicFeedService,
  PublicFeedPage,
  PublishFeedPostResult,
} from './public-feed.service';
import { PublicFeedQueryDto } from './dto/public-feed-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

/**
 * Public cultural-heritage discovery feed.
 *
 * The read endpoint is fully public (optional auth) and exposes only approved
 * public cultural content — never family-graph data. The publish endpoint is
 * authenticated and lets an author opt one of their own private posts into the
 * public world.
 */
@ApiTags('Public Feed')
@Controller('public-feed')
export class PublicFeedController {
  constructor(private readonly publicFeedService: PublicFeedService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'List approved public cultural-heritage content (verified-authority first, then newest; cursor-paginated). No authentication required.',
  })
  getPublicFeed(@Query() query: PublicFeedQueryDto): Promise<PublicFeedPage> {
    return this.publicFeedService.getPublicFeed({
      cursor: query.cursor,
      limit: query.limit,
      contentType: query.contentType,
      ethnicGroup: query.ethnicGroup,
    });
  }

  @Post('feed-posts/:id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Opt one of the author's own private family-feed posts into the public world (visibility -> PUBLIC).",
  })
  publishFeedPost(
    @Param('id', ParseUUIDPipe) feedPostId: string,
    @CurrentAccount('id') accountId: string,
  ): Promise<PublishFeedPostResult> {
    return this.publicFeedService.publishFeedPost(feedPostId, accountId);
  }
}
