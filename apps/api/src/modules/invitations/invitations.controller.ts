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
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto, ConsumeInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an invitation' })
  create(@Body() dto: CreateInvitationDto, @CurrentAccount('id') accountId: string) {
    return this.invitationsService.create(dto, accountId);
  }

  @Get('verify/:token')
  @Public()
  @ApiOperation({ summary: 'Verify an invitation token (public)' })
  verify(@Param('token') token: string) {
    return this.invitationsService.verify(token);
  }

  @Post('consume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consume an invitation token' })
  consume(
    @Body() dto: ConsumeInvitationDto,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.invitationsService.consume(dto.token, accountId);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get my sent invitations' })
  findMine(@CurrentAccount('id') accountId: string) {
    return this.invitationsService.findMine(accountId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel an invitation' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAccount('id') accountId: string,
  ) {
    return this.invitationsService.cancel(id, accountId);
  }
}
