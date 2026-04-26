import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PersonsService } from './persons.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

@ApiTags('Persons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('persons')
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60 * 60 * 1000 } })
  @ApiOperation({ summary: 'Create a new person' })
  create(@Body() dto: CreatePersonDto, @CurrentAccount('id') accountId: string) {
    return this.personsService.create(dto, accountId);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List persons created by the authenticated account' })
  findMine(
    @CurrentAccount('id') accountId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '50', 10) || 50));
    return this.personsService.findByAccount(accountId, { page: pageNum, limit: limitNum });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a person by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.personsService.findOne(id, accountId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a person' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.personsService.update(id, dto, accountId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a person' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentAccount('id') accountId: string) {
    return this.personsService.softDelete(id, accountId);
  }

  @Get(':id/family-tree')
  @ApiOperation({ summary: 'Get family tree around a person' })
  getFamilyTree(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
    @Query('degrees') degrees?: number,
  ) {
    // Clamp degrees to a sane window — DoS protection on graph traversal.
    const parsed = typeof degrees === 'string' ? parseInt(degrees, 10) : degrees;
    const safeDegrees = Math.max(1, Math.min(5, Number.isFinite(parsed) ? Number(parsed) : 2));
    return this.personsService.getFamilyTree(id, safeDegrees, accountId);
  }
}
