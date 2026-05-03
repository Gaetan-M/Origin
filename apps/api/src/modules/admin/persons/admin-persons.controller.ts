import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccountRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  AdminActor,
  AdminActorCtx,
} from '../../../common/decorators/admin-actor.decorator';
import { AdminPersonsService } from './admin-persons.service';
import { ListPersonsDto } from './dto/list-persons.dto';
import { AdminUpdatePersonDto } from './dto/admin-update-person.dto';
import { DeletePersonDto } from './dto/delete-person.dto';
import { ForceMergeDto } from './dto/force-merge.dto';

@ApiTags('admin/persons')
@ApiBearerAuth()
@Controller('admin/persons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.MODERATOR)
export class AdminPersonsController {
  constructor(private readonly service: AdminPersonsService) {}

  @Get()
  @ApiOperation({
    summary: 'List persons (moderator view) with rich filters and pagination.',
  })
  list(@Query() query: ListPersonsDto) {
    return this.service.list(query);
  }

  /**
   * Static routes that share the `/admin/persons` prefix MUST be declared
   * before the `:id` catch-all — otherwise Nest matches "orphans" /
   * "duplicates" / "force-merge" against the param route and returns 400.
   */
  @Get('orphans')
  @ApiOperation({
    summary:
      'List persons with no relations and no claim — surfaced for cleanup.',
  })
  listOrphans(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? Number(page) : 1;
    const l = limit ? Number(limit) : 20;
    return this.service.listOrphans(
      Number.isFinite(p) ? p : 1,
      Number.isFinite(l) ? l : 20,
    );
  }

  @Get('duplicates')
  @ApiOperation({
    summary:
      'List potential duplicate clusters (same normalized_name + birth_year_approximate).',
  })
  listDuplicates() {
    return this.service.listDuplicates();
  }

  @Post('force-merge')
  @HttpCode(HttpStatus.OK)
  @Roles(AccountRole.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Force-merge two persons without going through the MergeProposal queue.',
    description:
      'SUPER_ADMIN only. Reassigns relations to the keeper and soft-deletes the loser inside one transaction.',
  })
  forceMerge(@Body() dto: ForceMergeDto, @AdminActorCtx() actor: AdminActor) {
    return this.service.forceMerge(dto, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Full moderator detail of a single person.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit any subset of person fields. Reason mandatory.',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdminUpdatePersonDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Soft-delete a person. Reason mandatory.',
  })
  softDelete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DeletePersonDto,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.service.softDelete(id, dto, actor);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reverse a previous soft-delete by clearing deleted_at.',
  })
  restore(
    @Param('id', new ParseUUIDPipe()) id: string,
    @AdminActorCtx() actor: AdminActor,
  ) {
    return this.service.restore(id, actor);
  }
}
