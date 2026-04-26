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
import { KinshipProbeService } from './kinship-probe.service';
import { KinshipProbeDto } from './dto/kinship-probe.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

@ApiTags('Kinship Probe')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kinship-probe')
export class KinshipProbeController {
  constructor(private readonly kinshipProbe: KinshipProbeService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Submit a kinship probe — privacy-preserving way to ask a relative (by phone) to connect',
  })
  submit(
    @Body() dto: KinshipProbeDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.kinshipProbe.submit(dto, accountId);
  }

  @Get('incoming/:requesterAccountId')
  @ApiOperation({
    summary: 'Fetch context for an incoming probe (only if the responder has received it)',
  })
  getIncoming(
    @Param('requesterAccountId', ParseUUIDPipe) requesterAccountId: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.kinshipProbe.getIncoming(requesterAccountId, accountId);
  }
}
