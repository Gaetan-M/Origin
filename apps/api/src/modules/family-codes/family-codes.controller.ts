import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FamilyCodesService } from './family-codes.service';
import { CreateFamilyCodeDto } from './dto/create-family-code.dto';
import { RedeemFamilyCodeDto } from './dto/redeem-family-code.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

@ApiTags('Family Codes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('family-codes')
export class FamilyCodesController {
  constructor(private readonly familyCodes: FamilyCodesService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a new family code' })
  create(@Body() dto: CreateFamilyCodeDto, @CurrentAccount('id') accountId: string) {
    return this.familyCodes.create(dto, accountId);
  }

  @Get()
  @ApiOperation({ summary: 'List my family codes' })
  findMine(@CurrentAccount('id') accountId: string) {
    return this.familyCodes.findMine(accountId);
  }

  @Get(':id/uses')
  @ApiOperation({ summary: 'List who has redeemed this code' })
  findUses(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.familyCodes.findUses(id, accountId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a family code' })
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.familyCodes.revoke(id, accountId);
  }

  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Redeem a family code (consume one slot)' })
  redeem(@Body() dto: RedeemFamilyCodeDto, @CurrentAccount('id') accountId: string) {
    return this.familyCodes.redeem(dto, accountId);
  }
}
