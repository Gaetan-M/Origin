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
import { RespondCheckDto } from './dto/respond-check.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

/**
 * "Sommes-nous parents ?" — consent-based, privacy-preserving kinship check.
 *
 * Every response is the privacy-safe view: lifecycle state plus, once computed,
 * ONLY { related, degree, labelFr, labelEn }. No persons, names, ancestors,
 * path or phone are ever returned.
 */
@ApiTags('Kinship Check')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kinship-check')
export class KinshipCheckController {
  constructor(private readonly kinshipCheck: KinshipCheckService) {}

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

  @Get('mine')
  @ApiOperation({
    summary: 'List my incoming and outgoing kinship checks (results aggregate-only)',
  })
  listMine(@CurrentAccount('id') accountId: string) {
    return this.kinshipCheck.listMine(accountId);
  }

  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Consent to or decline a kinship check addressed to you. Dual consent triggers the computation.',
  })
  respond(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondCheckDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.kinshipCheck.respond(id, accountId, dto.consent);
  }
}
