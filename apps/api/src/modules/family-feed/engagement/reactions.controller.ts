import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../../common/decorators/current-account.decorator';
import { ReactionsService } from './reactions.service';
import { ReactDto } from './dto/react.dto';

@ApiTags('Family Feed — Reactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('family-feed/posts/:postId/reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  @ApiOperation({ summary: 'React to a feed post / Réagir à une publication' })
  react(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: ReactDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.reactionsService.react(postId, accountId, dto.reactionType);
  }

  @Delete()
  @ApiOperation({
    summary: 'Remove a reaction / Retirer une réaction',
  })
  unreact(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: ReactDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.reactionsService.unreact(postId, accountId, dto.reactionType);
  }
}
