import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IdentityDocumentsService } from './identity-documents.service';
import { CreateIdentityDocumentDto } from './dto/create-identity-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';

@ApiTags('Identity Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('identity-documents')
export class IdentityDocumentsController {
  constructor(
    private readonly identityDocumentsService: IdentityDocumentsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an identity document record' })
  create(
    @Body() dto: CreateIdentityDocumentDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.identityDocumentsService.create(dto, accountId);
  }

  @Get('person/:personId')
  @ApiOperation({ summary: 'List identity documents for a person (masked numbers)' })
  findByPerson(@Param('personId', ParseUUIDPipe) personId: string) {
    return this.identityDocumentsService.findByPerson(personId);
  }

  @Get(':id/reveal')
  @ApiOperation({
    summary: 'Reveal the full document number (claim owner only)',
  })
  reveal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.identityDocumentsService.reveal(id, accountId);
  }

  // POST /identity-documents/:id/verify — INTENTIONALLY DISABLED.
  // The action requires a moderator/admin role guard which does not yet
  // exist in this codebase. Without it, any authenticated user could
  // self-verify their document and bump verificationLevel to ADMIN_VERIFIED.
  // Re-enable when RoleGuard ships.

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an identity document' })
  softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.identityDocumentsService.softDelete(id, accountId);
  }
}
