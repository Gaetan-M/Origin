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
import { CreateLiveDto } from './dto/create-live.dto';
import { JoinLiveDto } from './dto/join-live.dto';
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
  constructor(private readonly liveService: LiveService) {}

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
}
