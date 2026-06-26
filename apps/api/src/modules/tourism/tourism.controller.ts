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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AccountRole, TourismCategory, type TourismPlace } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';
import {
  AdminActor,
  AdminActorCtx,
} from '../../common/decorators/admin-actor.decorator';
import { TourismService } from './tourism.service';
import { SubmitPlaceDto } from './dto/submit-place.dto';
import { VerifyPlaceDto } from './dto/verify-place.dto';

/**
 * PUBLIC tourism / heritage discovery surface.
 *
 * - `GET /tourism/places` and `GET /tourism/places/:id` are PUBLIC (optional
 *   JWT): anyone can browse highlighted places, and every record shows its
 *   provenance (source + sourceRef) so the origin is transparent.
 * - `POST /tourism/places` requires authentication: any account may submit a
 *   place (created UNVERIFIED).
 * - `POST /tourism/places/:id/verify` requires MODERATOR+ (ADMIN / SUPER_ADMIN
 *   inherit via RolesGuard).
 *
 * No endpoint here returns or accepts any family-graph data — tourism is a
 * fully isolated public vertical of the discovery world.
 */
@ApiTags('Tourism')
@Controller('tourism')
export class TourismController {
  constructor(private readonly tourism: TourismService) {}

  // ----------------------------------------------------------------
  // Public browsing (optional JWT)
  // ----------------------------------------------------------------

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'List PUBLIC tourism places (verified-first), with provenance shown',
  })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'category', required: false, enum: TourismCategory })
  @ApiQuery({ name: 'verifiedOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listPlaces(
    @Query('region') region?: string,
    @Query('category') category?: TourismCategory,
    @Query('verifiedOnly') verifiedOnly?: string,
    @Query('limit') limit?: string,
  ): Promise<{ items: TourismPlace[]; nextCursor: string | null }> {
    // Lenient query parsing (no strict pipes) so the public browse endpoint
    // never 400s on absent/loose params from the web client.
    const take = limit && Number.isFinite(Number(limit)) ? Number(limit) : undefined;
    const items = await this.tourism.listPlaces({
      region: region || undefined,
      category,
      verifiedOnly: verifiedOnly === 'true' ? true : undefined,
      take,
    });
    return { items, nextCursor: null };
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Fetch a single PUBLIC tourism place by id (provenance included)',
  })
  getPlace(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TourismPlace> {
    return this.tourism.getPlace(id);
  }

  // ----------------------------------------------------------------
  // Submission (any authenticated account)
  // ----------------------------------------------------------------

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Submit a tourism place (created UNVERIFIED; a moderator verifies later)',
  })
  submitPlace(
    @CurrentAccount('id') accountId: string,
    @Body() dto: SubmitPlaceDto,
  ): Promise<TourismPlace> {
    return this.tourism.submitPlace(accountId, dto);
  }

  // ----------------------------------------------------------------
  // Verification (moderator+)
  // ----------------------------------------------------------------

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.MODERATOR)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Grant or revoke the verified badge of a tourism place',
  })
  verifyPlace(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: VerifyPlaceDto,
    @AdminActorCtx() actor: AdminActor,
  ): Promise<TourismPlace> {
    return this.tourism.verifyPlace(id, actor, dto.verified, dto.reason ?? null);
  }
}
