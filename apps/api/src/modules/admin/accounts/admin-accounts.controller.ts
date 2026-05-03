import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AccountRole } from '@prisma/client';
import { AdminAccountsService } from './admin-accounts.service';
import { ListAccountsDto } from './dto/list-accounts.dto';
import { UpdateAccountRoleDto } from './dto/update-account-role.dto';
import { BanAccountDto, DeleteAccountDto } from './dto/ban-account.dto';
import { AdminUpdateAccountDto } from './dto/admin-update-account.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  AdminActorCtx,
  type AdminActor,
} from '../../../common/decorators/admin-actor.decorator';

@ApiTags('Admin / Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.MODERATOR)
@Controller('admin/accounts')
export class AdminAccountsController {
  constructor(private readonly adminAccountsService: AdminAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List accounts with admin filters' })
  list(@Query() query: ListAccountsDto) {
    return this.adminAccountsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an account with admin-relevant aggregates' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminAccountsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update admin-managed profile fields (fullName, email, notes)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateAccountDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.adminAccountsService.updateProfile(id, dto, actor);
  }

  @Patch(':id/role')
  @Roles(AccountRole.ADMIN)
  @ApiOperation({
    summary: 'Change an account role (ADMIN+ only; SUPER_ADMIN required for ADMIN/SUPER_ADMIN grants)',
  })
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountRoleDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.adminAccountsService.updateRole(id, dto, actor);
  }

  @Post(':id/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban an account (cannot ban equal-or-higher rank)' })
  ban(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BanAccountDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.adminAccountsService.ban(id, dto, actor);
  }

  @Post(':id/unban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lift a ban from an account' })
  unban(
    @Param('id', ParseUUIDPipe) id: string,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.adminAccountsService.unban(id, actor);
  }

  @Delete(':id')
  @Roles(AccountRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an account (ADMIN+; SUPER_ADMIN targets refused)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteAccountDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.adminAccountsService.softDelete(id, dto, actor);
  }

  @Post(':id/restore')
  @Roles(AccountRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted account' })
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.adminAccountsService.restore(id, actor);
  }

  @Get(':id/contributions')
  @ApiOperation({ summary: 'List contributions made by this account (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 20, max 100)' })
  listContributions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminAccountsService.listContributions(id, { page, limit });
  }

  @Get(':id/audit-trail')
  @ApiOperation({ summary: 'List admin audit-log entries targeting this account' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 20, max 100)' })
  listAuditTrail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminAccountsService.listAuditTrail(id, { page, limit });
  }
}
