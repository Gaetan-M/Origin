import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KinshipCheckService } from './kinship-check.service';
import { InitiateCheckDto } from './dto/initiate-check.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

/**
 * "Sommes-nous parents ?" — consent-based, privacy-preserving kinship check.
 *
 * Mounted at `/kinship-checks` (plural) to match the deployed web client.
 *
 * Every response is the privacy-safe view: lifecycle state, direction, the
 * counterparty's display name (for informed consent only), and — once computed
 * — ONLY { related, degree, labelFr, labelEn }. No persons, ancestors, graph
 * path or phone are ever returned.
 */
@ApiTags('Kinship Check')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kinship-checks')
export class KinshipCheckController {
  constructor(private readonly kinshipCheck: KinshipCheckService) {}

  @Get()
  @ApiOperation({
    summary:
      'My incoming and outgoing kinship checks ({ incoming, outgoing }; results aggregate-only)',
  })
  list(@CurrentAccount('id') accountId: string) {
    return this.kinshipCheck.listMine(accountId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Initiate a kinship check with another user (by phone, account id, or family code)',
  })
  initiate(
    @Body() dto: InitiateCheckDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.kinshipCheck.initiate(accountId, dto);
  }

  @Post(':id/consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Target consents to a check addressed to them. Dual consent triggers the computation.',
  })
  consent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.kinshipCheck.respond(id, accountId, true);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Target declines a check addressed to them. Nothing is ever computed.',
  })
  decline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.kinshipCheck.respond(id, accountId, false);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Requester withdraws their own still-pending outgoing check.',
  })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.kinshipCheck.cancel(id, accountId);
  }
}
