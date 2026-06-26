import {
  Body,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  LiveSessionStatus,
  VisibilityScope,
  type LiveSession,
} from '@prisma/client';
import {
  LiveService,
  type JoinTokenResult,
  type LiveTokenResponse,
  type LiveReplayResponse,
} from './live.service';
import {
  LiveInvitationService,
  type InvitationView,
  type InviteResult,
} from './live-invitation.service';
import {
  LiveHostControlService,
  type HostControlResult,
  type RaiseHandResult,
  type RosterEntry,
} from './live-host-control.service';
import { CreateLiveDto } from './dto/create-live.dto';
import { JoinLiveDto } from './dto/join-live.dto';
import { InviteLiveDto } from './dto/invite-live.dto';
import { RespondInviteDto } from './dto/respond-invite.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

/**
 * LIVE sessions API — schedule, host-control lifecycle, list (visibility
 * enforced) and mint short-lived LiveKit join tokens.
 *
 * Token minting is gated on LiveKit credentials: when LiveKit is not
 * configured the join endpoint returns 503 "Live not configured" while every
 * other endpoint keeps working, so the platform degrades gracefully.
 */
@ApiTags('Live')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('live')
export class LiveController {
  constructor(
    private readonly liveService: LiveService,
    private readonly invitations: LiveInvitationService,
    private readonly hostControl: LiveHostControlService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Schedule a new live session (PUBLIC lessons/masterclasses require a verified authority)',
  })
  createSession(
    @CurrentAccount('id') accountId: string,
    @Body() dto: CreateLiveDto,
  ): Promise<LiveSession> {
    return this.liveService.createSession(accountId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List live sessions visible to the current account',
  })
  @ApiQuery({ name: 'scope', enum: VisibilityScope, required: false })
  @ApiQuery({ name: 'status', enum: LiveSessionStatus, required: false })
  listSessions(
    @CurrentAccount('id') accountId: string,
    @Query('scope') scope?: VisibilityScope,
    @Query('status') status?: LiveSessionStatus,
  ): Promise<LiveSession[]> {
    return this.liveService.listSessions(accountId, { scope, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single live session (visibility enforced)' })
  getSession(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<LiveSession> {
    return this.liveService.getSession(id, accountId);
  }

  @Get(':id/token')
  @ApiOperation({
    summary:
      'Get a LiveKit join token; returns { configured: false } when live is not provisioned',
  })
  getTokenGraceful(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<LiveTokenResponse> {
    return this.liveService.getJoinTokenResponse(id, accountId);
  }

  @Get(':id/replay')
  @ApiOperation({ summary: 'Get the replay playback descriptor for a session' })
  getReplay(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<LiveReplayResponse> {
    return this.liveService.getReplay(id, accountId);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a scheduled live session (host only)' })
  startSession(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<LiveSession> {
    return this.liveService.startSession(id, accountId);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End a live session (host only)' })
  endSession(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<LiveSession> {
    return this.liveService.endSession(id, accountId);
  }

  @Post(':id/token')
  @ApiOperation({
    summary:
      'Mint a short-lived LiveKit join token (returns 503 when live is not configured)',
  })
  getJoinToken(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: JoinLiveDto,
  ): Promise<JoinTokenResult> {
    return this.liveService.getJoinToken(id, accountId, dto);
  }

  // --- invitations ---------------------------------------------------------

  @Post('join-by-code/:code')
  @ApiOperation({
    summary:
      'Resolve a live session from a shared invite code (visibility still enforced)',
  })
  joinByCode(
    @CurrentAccount('id') accountId: string,
    @Param('code') code: string,
  ): Promise<LiveSession> {
    return this.liveService.getSessionByCode(code, accountId);
  }

  @Post(':id/invite-code')
  @ApiOperation({
    summary:
      'Ensure the session has a shareable invite code (host only); idempotent',
  })
  ensureInviteCode(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<LiveSession> {
    return this.liveService.ensureInviteCode(id, accountId);
  }

  @Post(':id/invite')
  @ApiOperation({
    summary:
      'Invite relatives (accounts from the family graph and/or phones) to a live — host only',
  })
  invite(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: InviteLiveDto,
  ): Promise<InviteResult> {
    return this.invitations.invite(id, accountId, dto);
  }

  @Get(':id/invitations')
  @ApiOperation({ summary: 'List a live session’s invitations (host only)' })
  listInvitations(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<InvitationView[]> {
    return this.invitations.listInvitations(id, accountId);
  }

  @Post(':id/respond-invite')
  @ApiOperation({ summary: 'Accept or decline a live invitation (invitee)' })
  respondInvite(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RespondInviteDto,
  ): Promise<InvitationView> {
    return this.invitations.respond(id, accountId, dto.accept);
  }

  // --- host controls + roster ---------------------------------------------

  @Get(':id/participants')
  @ApiOperation({
    summary: 'Live participant roster for the host panel (host only)',
  })
  getRoster(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<RosterEntry[]> {
    return this.hostControl.getRoster(id, accountId);
  }

  @Post(':id/raise-hand')
  @ApiOperation({
    summary: 'Toggle your own raised hand in a live (participant)',
  })
  raiseHand(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<RaiseHandResult> {
    return this.hostControl.toggleHand(id, accountId);
  }

  @Post(':id/participants/:identity/mute')
  @ApiOperation({ summary: 'Mute a participant’s audio (host only)' })
  muteParticipant(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('identity', new ParseUUIDPipe()) identity: string,
  ): Promise<HostControlResult> {
    return this.hostControl.muteParticipant(id, accountId, identity);
  }

  @Post(':id/participants/:identity/promote')
  @ApiOperation({
    summary: 'Promote a viewer to speaker / grant publish (host only)',
  })
  promoteParticipant(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('identity', new ParseUUIDPipe()) identity: string,
  ): Promise<HostControlResult> {
    return this.hostControl.promoteParticipant(id, accountId, identity);
  }

  @Post(':id/participants/:identity/remove')
  @ApiOperation({ summary: 'Remove a participant from a live (host only)' })
  removeParticipant(
    @CurrentAccount('id') accountId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('identity', new ParseUUIDPipe()) identity: string,
  ): Promise<HostControlResult> {
    return this.hostControl.removeParticipant(id, accountId, identity);
  }
}
