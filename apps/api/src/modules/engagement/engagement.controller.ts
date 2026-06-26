import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';
import { EngagementActor, EngagementService } from './engagement.service';
import { ReactDto } from './dto/react.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { BatchSummaryDto } from './dto/batch-summary.dto';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { RateDto } from './dto/rate.dto';
import { SuggestEditDto } from './dto/suggest-edit.dto';
import { ModerateDto } from './dto/moderate.dto';

/**
 * Engagement layer REST surface. `:targetType` ∈ {tourism-place, cultural-content}.
 *
 * Reads use OptionalJwtAuthGuard so `myReaction` / `mine` populate when a token
 * is present (else null). Writes use JwtAuthGuard. Moderation routes additionally
 * require @Roles(MODERATOR). Literal-prefixed routes are declared before the
 * generic `:targetType` routes so they are matched first.
 */
@ApiTags('Engagement')
@Controller('engagement')
export class EngagementController {
  constructor(private readonly engagement: EngagementService) {}

  // --- Batch summary (literal) ----------------------------------------------

  @Post('summary/batch')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Batch engagement summary / Résumé groupé' })
  batchSummary(@Body() dto: BatchSummaryDto) {
    return this.engagement.batchSummary(dto);
  }

  // --- Comment delete (literal) ---------------------------------------------

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a comment / Supprimer un commentaire' })
  async deleteComment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount() actor: EngagementActor,
  ): Promise<void> {
    await this.engagement.deleteComment(id, actor);
  }

  // --- Moderation (literal) -------------------------------------------------

  @Get('moderation/photos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List photos for moderation / Photos à modérer' })
  listPhotosForModeration(@Query('status') status?: string) {
    return this.engagement.listPhotosForModeration(status);
  }

  @Post('photos/:id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderate a photo / Modérer une photo' })
  moderatePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateDto,
    @CurrentAccount() actor: EngagementActor,
  ) {
    return this.engagement.moderatePhoto(id, actor, dto.decision);
  }

  @Get('moderation/suggestions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List edit-suggestions for moderation / Suggestions à modérer' })
  listSuggestionsForModeration(@Query('status') status?: string) {
    return this.engagement.listSuggestionsForModeration(status);
  }

  @Post('suggestions/:id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderate an edit-suggestion / Modérer une suggestion' })
  moderateSuggestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateDto,
    @CurrentAccount() actor: EngagementActor,
  ) {
    return this.engagement.moderateSuggestion(id, actor, dto.decision);
  }

  // --- Summary (generic) ----------------------------------------------------

  @Get(':targetType/:targetId/summary')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Engagement summary / Résumé des interactions' })
  getSummary(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @CurrentAccount('id') accountId?: string,
  ) {
    return this.engagement.getSummary(targetType, targetId, accountId);
  }

  // --- Reactions ------------------------------------------------------------

  @Put(':targetType/:targetId/reaction')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set my reaction / Définir ma réaction' })
  setReaction(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Body() dto: ReactDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.engagement.setReaction(targetType, targetId, accountId, dto.type);
  }

  @Delete(':targetType/:targetId/reaction')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove my reaction / Retirer ma réaction' })
  removeReaction(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.engagement.removeReaction(targetType, targetId, accountId);
  }

  // --- Comments -------------------------------------------------------------

  @Get(':targetType/:targetId/comments')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List comments / Lister les commentaires' })
  listComments(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @CurrentAccount('id') accountId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.engagement.listComments(
      targetType,
      targetId,
      accountId,
      cursor,
      limit,
    );
  }

  @Post(':targetType/:targetId/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment / Ajouter un commentaire' })
  addComment(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Body() dto: CreateCommentDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.engagement.addComment(targetType, targetId, accountId, dto.body);
  }

  // --- Photos ---------------------------------------------------------------

  @Get(':targetType/:targetId/photos')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List contributed photos / Photos contribuées' })
  listPhotos(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @CurrentAccount('id') accountId?: string,
  ) {
    return this.engagement.listPhotos(targetType, targetId, accountId);
  }

  @Post(':targetType/:targetId/photos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Contribute a photo / Proposer une photo' })
  addPhoto(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Body() dto: CreatePhotoDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.engagement.addPhoto(
      targetType,
      targetId,
      accountId,
      dto.mediaId,
      dto.caption,
    );
  }

  // --- Rating (tourism-place only) ------------------------------------------

  @Post(':targetType/:targetId/rating')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rate a place / Noter un lieu' })
  ratePlace(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Body() dto: RateDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.engagement.ratePlace(targetType, targetId, accountId, dto.stars);
  }

  // --- Edit suggestions -----------------------------------------------------

  @Post(':targetType/:targetId/suggest-edit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suggest an edit / Proposer une correction' })
  suggestEdit(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Body() dto: SuggestEditDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.engagement.suggestEdit(targetType, targetId, accountId, dto);
  }
}
