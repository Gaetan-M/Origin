import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Source } from '@prisma/client';
import { OralHistoryService } from './oral-history.service';
import { CreateTestimonyDto } from './dto/create-testimony.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

/**
 * Oral-history API — capture and retrieve elders' audio/video testimonies.
 *
 * The recording itself is uploaded via the media module; here we only attach
 * the resulting media to the family graph and manage its transcript and
 * visibility. Listing is visibility-aware (handled in the service).
 */
@ApiTags('Oral History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('oral-history')
export class OralHistoryController {
  constructor(private readonly oralHistoryService: OralHistoryService) {}

  @Post('testimonies')
  @ApiOperation({
    summary:
      'Record an elder testimony (audio/video already uploaded via media) against a person or union',
  })
  recordTestimony(
    @CurrentAccount('id') accountId: string,
    @Body() dto: CreateTestimonyDto,
  ): Promise<Source> {
    return this.oralHistoryService.recordTestimony(accountId, {
      personId: dto.personId,
      unionId: dto.unionId,
      mediaId: dto.mediaId,
      transcript: dto.transcript,
      title: dto.title,
      sourceType: dto.sourceType,
      visibilityScope: dto.visibilityScope,
    });
  }

  @Get('persons/:personId/testimonies')
  @ApiOperation({
    summary:
      'List the testimonies attached to a person, filtered to what the requester may see',
  })
  listForPerson(
    @CurrentAccount('id') accountId: string,
    @Param('personId', new ParseUUIDPipe()) personId: string,
  ): Promise<Source[]> {
    return this.oralHistoryService.listForPerson(personId, accountId);
  }
}
