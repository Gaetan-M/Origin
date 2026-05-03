import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  AdminActor,
  AdminActorCtx,
} from '../../../common/decorators/admin-actor.decorator';
import { AdminModerationService } from './admin-moderation.service';
import { ListQueueDto } from './dto/list-queue.dto';
import {
  ApproveClaimDto,
  DisputeClaimDto,
  RejectClaimDto,
} from './dto/review-claim.dto';
import { ApproveMergeDto, RejectMergeDto } from './dto/review-merge.dto';
import { ResolveVerificationDto } from './dto/review-verification.dto';
import {
  RejectDocumentDto,
  VerifyDocumentDto,
} from './dto/review-document.dto';

/**
 * Admin moderation surface. Every route requires at least the
 * MODERATOR role; ADMIN and SUPER_ADMIN inherit access via the
 * RolesGuard "minimum-rank" semantic.
 */
@ApiTags('Admin / Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.MODERATOR)
@Controller('admin/moderation')
export class AdminModerationController {
  constructor(private readonly moderation: AdminModerationService) {}

  // ----------------------------------------------------------------
  // Queue overview
  // ----------------------------------------------------------------

  @Get('queue')
  @ApiOperation({
    summary: 'Aggregated counts for the moderation dashboard landing page',
  })
  getQueue() {
    return this.moderation.getQueueOverview();
  }

  // ----------------------------------------------------------------
  // Claims
  // ----------------------------------------------------------------

  @Get('claims')
  @ApiOperation({ summary: 'List claims awaiting moderation' })
  listClaims(@Query() query: ListQueueDto) {
    return this.moderation.listClaims(query);
  }

  @Post('claims/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a claim and link the person to the account' })
  approveClaim(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveClaimDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.moderation.approveClaim(id, dto, actor);
  }

  @Post('claims/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a claim' })
  rejectClaim(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectClaimDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.moderation.rejectClaim(id, dto, actor);
  }

  @Post('claims/:id/dispute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a claim as disputed' })
  disputeClaim(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisputeClaimDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.moderation.disputeClaim(id, dto, actor);
  }

  // ----------------------------------------------------------------
  // Merge proposals
  // ----------------------------------------------------------------

  @Get('merges')
  @ApiOperation({ summary: 'List pending merge proposals' })
  listMerges(@Query() query: ListQueueDto) {
    return this.moderation.listMerges(query);
  }

  @Post('merges/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Approve a merge: relations move to the keeper, the loser is soft-deleted',
  })
  approveMerge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveMergeDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.moderation.approveMerge(id, dto, actor);
  }

  @Post('merges/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a merge proposal' })
  rejectMerge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectMergeDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.moderation.rejectMerge(id, dto, actor);
  }

  // ----------------------------------------------------------------
  // Verification requests
  // ----------------------------------------------------------------

  @Get('verifications')
  @ApiOperation({ summary: 'List verification requests in PENDING / IN_REVIEW' })
  listVerifications(@Query() query: ListQueueDto) {
    return this.moderation.listVerifications(query);
  }

  @Post('verifications/:id/assign-to-me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a verification request to the current moderator' })
  assignVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.moderation.assignVerificationToMe(id, actor);
  }

  @Post('verifications/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a verification request (approved or rejected)' })
  resolveVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveVerificationDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.moderation.resolveVerification(id, dto, actor);
  }

  // ----------------------------------------------------------------
  // Identity documents
  // ----------------------------------------------------------------

  @Get('identity-documents')
  @ApiOperation({ summary: 'List identity documents awaiting moderator review' })
  listIdentityDocuments(@Query() query: ListQueueDto) {
    return this.moderation.listIdentityDocuments(query);
  }

  @Post('identity-documents/:id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an identity document as ADMIN_VERIFIED' })
  verifyIdentityDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyDocumentDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.moderation.verifyIdentityDocument(id, dto, actor);
  }

  @Post('identity-documents/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an identity document as DISPUTED' })
  rejectIdentityDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDocumentDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.moderation.rejectIdentityDocument(id, dto, actor);
  }
}
