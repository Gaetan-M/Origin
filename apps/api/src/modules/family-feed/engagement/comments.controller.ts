import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../../common/decorators/current-account.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('Family Feed — Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('family-feed')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('posts/:postId/comments')
  @ApiOperation({
    summary: 'List comments on a post / Lister les commentaires',
  })
  list(
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.commentsService.list(postId, accountId);
  }

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: 'Comment on a post / Commenter une publication' })
  add(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CreateCommentDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.commentsService.add(postId, accountId, dto.body);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment / Supprimer un commentaire' })
  remove(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.commentsService.remove(commentId, accountId);
  }
}
