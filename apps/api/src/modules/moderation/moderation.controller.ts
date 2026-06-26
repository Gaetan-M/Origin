import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';
import {
  AdminActor,
  AdminActorCtx,
} from '../../common/decorators/admin-actor.decorator';
import { ModerationService } from './moderation.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { ModerateContentDto } from './dto/moderate-content.dto';
import { VerifyAuthorityDto } from './dto/verify-authority.dto';

/**
 * Public-world moderation surface.
 *
 * - `POST /moderation/reports` is open to any authenticated account.
 * - Every other route requires MODERATOR (ADMIN / SUPER_ADMIN inherit via
 *   the RolesGuard "minimum-rank" rule). Handlers without `@Roles(...)` are
 *   unrestricted beyond authentication, so the report route stays open while
 *   sharing the same controller-level guards.
 */
@ApiTags('Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  // ----------------------------------------------------------------
  // Reporting (any authenticated user)
  // ----------------------------------------------------------------

  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Report a piece of public content' })
  report(
    @CurrentAccount('id') reporterAccountId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderation.report({
      reporterAccountId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
      details: dto.details ?? null,
    });
  }

  // ----------------------------------------------------------------
  // Queue (moderator+)
  // ----------------------------------------------------------------

  @Get('reports')
  @Roles(AccountRole.MODERATOR)
  @ApiOperation({ summary: 'List OPEN / REVIEWING reports (oldest first)' })
  queue(
    @AdminActorCtx() actor: AdminActor,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    return this.moderation.queue(actor, { take, skip });
  }

  @Post('reports/:id/resolve')
  @Roles(AccountRole.MODERATOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve or dismiss a report' })
  resolveReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReportDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.moderation.resolveReport(
      id,
      dto.status,
      dto.resolution ?? null,
      actor,
    );
  }

  // ----------------------------------------------------------------
  // Cultural-content verdicts (moderator+)
  // ----------------------------------------------------------------

  @Post('cultural-content/:id/moderate')
  @Roles(AccountRole.MODERATOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a piece of cultural content' })
  moderateCulturalContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateContentDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.moderation.moderateCulturalContent(id, dto.decision, actor);
  }

  // ----------------------------------------------------------------
  // Authority verification (moderator+)
  // ----------------------------------------------------------------

  @Post('authorities/:id/verify')
  @Roles(AccountRole.MODERATOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Grant or revoke the verified badge of a cultural authority',
  })
  verifyAuthority(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyAuthorityDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.moderation.verifyAuthority(
      id,
      dto.verified,
      actor,
      dto.reason ?? null,
    );
  }
}
