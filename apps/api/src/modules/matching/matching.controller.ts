import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { MatchingService } from './matching.service';
import { SearchMatchDto } from './dto/search-match.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

class ResolveSuggestionDto {
  @IsString()
  @IsIn(['accept', 'reject'])
  decision!: 'accept' | 'reject';
}

@ApiTags('Matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('search')
  @ApiOperation({ summary: 'Search for person matches using fuzzy matching' })
  search(@Body() dto: SearchMatchDto, @CurrentAccount('id') accountId: string) {
    return this.matchingService.search(dto, accountId);
  }

  @Get('duplicates/:personId')
  @ApiOperation({ summary: 'Find potential duplicates for a person' })
  findDuplicates(@Param('personId', ParseUUIDPipe) personId: string) {
    return this.matchingService.findDuplicates(personId);
  }

  @Get('suggestions/:proposalId')
  @ApiOperation({ summary: 'Fetch a match suggestion (MergeProposal) by id' })
  getSuggestion(
    @Param('proposalId', ParseUUIDPipe) proposalId: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.matchingService.getSuggestion(proposalId, accountId);
  }

  @Post('suggestions/:proposalId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept or reject a match suggestion' })
  resolveSuggestion(
    @Param('proposalId', ParseUUIDPipe) proposalId: string,
    @Body() dto: ResolveSuggestionDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.matchingService.resolveSuggestion(proposalId, accountId, dto.decision);
  }
}
