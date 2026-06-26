import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CulturalAuthority, CulturalContent } from '@prisma/client';
import { CulturalContentService } from './cultural-content.service';
import { CreateCulturalContentDto } from './dto/create-cultural-content.dto';
import { RegisterAuthorityDto } from './dto/register-authority.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

/**
 * Authoring API for the PUBLIC cultural-heritage world.
 *
 * Lets authenticated accounts publish cultural content and self-register as a
 * cultural authority. No endpoint here returns or accepts any family-graph
 * data — the public world is fully isolated from the private family graph.
 */
@ApiTags('Cultural Content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cultural-content')
export class CulturalContentController {
  constructor(private readonly culturalContentService: CulturalContentService) {}

  @Post()
  @ApiOperation({
    summary:
      'Publish a piece of cultural content (auto-approved for verified authorities, otherwise PENDING moderation)',
  })
  createContent(
    @CurrentAccount('id') accountId: string,
    @Body() dto: CreateCulturalContentDto,
  ): Promise<CulturalContent> {
    return this.culturalContentService.createContent(dto, accountId);
  }

  @Post('authorities')
  @ApiOperation({
    summary:
      'Self-register the current account as a cultural authority (created unverified; a moderator verifies later)',
  })
  registerAsAuthority(
    @CurrentAccount('id') accountId: string,
    @Body() dto: RegisterAuthorityDto,
  ): Promise<CulturalAuthority> {
    return this.culturalContentService.registerAsAuthority(dto, accountId);
  }

  @Get('mine')
  @ApiOperation({
    summary: 'List the current account’s own authored cultural content',
  })
  listMine(
    @CurrentAccount('id') accountId: string,
  ): Promise<CulturalContent[]> {
    return this.culturalContentService.listMine(accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a single cultural content item by id' })
  getById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CulturalContent> {
    return this.culturalContentService.getById(id);
  }
}
