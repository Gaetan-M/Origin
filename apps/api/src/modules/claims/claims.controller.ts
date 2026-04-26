import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClaimsService } from './claims.service';
import { CreateClaimDto, DisputeClaimDto } from './dto/create-claim.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

@ApiTags('Claims')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a claim on a person' })
  create(@Body() dto: CreateClaimDto, @CurrentAccount('id') accountId: string) {
    return this.claimsService.create(dto, accountId);
  }

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a claim (by a linked family member)' })
  validate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.claimsService.validate(id, accountId);
  }

  @Post(':id/dispute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispute a claim' })
  dispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisputeClaimDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.claimsService.dispute(id, dto, accountId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending claims for current account to validate' })
  findPending(@CurrentAccount('id') accountId: string) {
    return this.claimsService.findPending(accountId);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get current account claims' })
  findMine(@CurrentAccount('id') accountId: string) {
    return this.claimsService.findMine(accountId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel own claim' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.claimsService.cancel(id, accountId);
  }
}
