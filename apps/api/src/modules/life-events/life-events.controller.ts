import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LifeEventsService } from './life-events.service';
import { RecordBirthDto } from './dto/record-birth.dto';
import { RecordDeathDto } from './dto/record-death.dto';
import { RecordUnionDto } from './dto/record-union.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

@ApiTags('Life Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('life-events')
export class LifeEventsController {
  constructor(private readonly lifeEventsService: LifeEventsService) {}

  @Post('birth')
  @Throttle({ default: { limit: 30, ttl: 60 * 60 * 1000 } })
  @ApiOperation({ summary: 'Record a birth (creates person + parent edges)' })
  recordBirth(@Body() dto: RecordBirthDto, @CurrentAccount('id') accountId: string) {
    return this.lifeEventsService.recordBirth(dto, accountId);
  }

  @Post('death')
  @Throttle({ default: { limit: 30, ttl: 60 * 60 * 1000 } })
  @ApiOperation({ summary: 'Record a death (flips life status to DECEASED)' })
  recordDeath(@Body() dto: RecordDeathDto, @CurrentAccount('id') accountId: string) {
    return this.lifeEventsService.recordDeath(dto, accountId);
  }

  @Post('union')
  @Throttle({ default: { limit: 30, ttl: 60 * 60 * 1000 } })
  @ApiOperation({ summary: 'Record a union (creates union + partners)' })
  recordUnion(@Body() dto: RecordUnionDto, @CurrentAccount('id') accountId: string) {
    return this.lifeEventsService.recordUnion(dto, accountId);
  }
}
