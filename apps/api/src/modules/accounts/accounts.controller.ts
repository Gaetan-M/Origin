import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdatePinDto, RemovePinDto } from './dto/update-pin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current account profile' })
  getMe(@CurrentAccount('id') accountId: string) {
    return this.accountsService.findOne(accountId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current account profile' })
  updateMe(
    @CurrentAccount('id') accountId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(accountId, dto);
  }

  @Post('me/pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set or change PIN' })
  setPin(
    @CurrentAccount('id') accountId: string,
    @Body() dto: UpdatePinDto,
  ) {
    return this.accountsService.setPin(accountId, dto);
  }

  @Delete('me/pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove PIN' })
  removePin(
    @CurrentAccount('id') accountId: string,
    @Body() dto: RemovePinDto,
  ) {
    return this.accountsService.removePin(accountId, dto.currentPin);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete current account' })
  deleteMe(@CurrentAccount('id') accountId: string) {
    return this.accountsService.softDelete(accountId);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Aggregate stats for the dashboard' })
  getStats(@CurrentAccount('id') accountId: string) {
    return this.accountsService.getStats(accountId);
  }

  @Get('me/contributions')
  @ApiOperation({ summary: 'Get current account contribution history' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' })
  getContributions(
    @CurrentAccount('id') accountId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const clampedLimit = Math.min(Math.max(limit, 1), 100);
    const clampedPage = Math.max(page, 1);
    return this.accountsService.getContributions(accountId, {
      page: clampedPage,
      limit: clampedLimit,
    });
  }
}
