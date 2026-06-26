import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MemorialService } from './memorial.service';
import { CreateTributeDto } from './dto/create-tribute.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

/**
 * Memorial tributes API (Phase 4 — Living Memory).
 *
 * Tributes honour a deceased person. Access is authenticated; per-tribute
 * visibility is enforced inside the service against the shared visibility model.
 */
@ApiTags('Memorial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('persons/:personId/tributes')
export class MemorialController {
  constructor(private readonly memorialService: MemorialService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60 * 60 * 1000 } })
  @ApiOperation({ summary: 'Leave a tribute on a deceased person' })
  @ApiParam({ name: 'personId', description: 'Id of the deceased person' })
  addTribute(
    @Param('personId', new ParseUUIDPipe({ version: '4' })) personId: string,
    @Body() dto: CreateTributeDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.memorialService.addTribute(accountId, personId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List visible tributes for a person, newest first',
  })
  @ApiParam({ name: 'personId', description: 'Id of the person' })
  listTributes(
    @Param('personId', new ParseUUIDPipe({ version: '4' })) personId: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.memorialService.listTributes(personId, accountId);
  }

  @Delete(':tributeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Withdraw a tribute (author only)' })
  @ApiParam({ name: 'personId', description: 'Id of the person' })
  @ApiParam({ name: 'tributeId', description: 'Id of the tribute to withdraw' })
  async removeTribute(
    @Param('tributeId', new ParseUUIDPipe({ version: '4' })) tributeId: string,
    @CurrentAccount('id') accountId: string,
  ): Promise<void> {
    await this.memorialService.removeTribute(tributeId, accountId);
  }
}
