import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccountRole } from '@prisma/client';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  AdminAuditReadService,
  AuditLogDetail,
  PaginatedAuditLogs,
} from './admin-audit.service';
import { ExportAuditLogsDto, ListAuditLogsDto } from './dto/list-audit-logs.dto';

/**
 * Read-only admin audit endpoints.
 *
 * The audit trail is a sensitive resource: actor identities, target
 * accounts and free-text reasons can together leak privileged context.
 * The whole controller is gated to ADMIN+; the export endpoint narrows
 * further to SUPER_ADMIN.
 */
@ApiTags('admin-audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/audit')
export class AdminAuditController {
  constructor(private readonly auditRead: AdminAuditReadService) {}

  @Get()
  @ApiOperation({ summary: 'List admin audit log entries with filters and pagination' })
  @ApiOkResponse({ description: 'Paginated audit log entries (no before/after state).' })
  async list(@Query() query: ListAuditLogsDto): Promise<PaginatedAuditLogs> {
    return this.auditRead.list(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Return distinct category values for filter dropdowns' })
  @ApiOkResponse({ type: [String] })
  async categories(): Promise<string[]> {
    return this.auditRead.listCategories();
  }

  @Get('export.json')
  @Roles(AccountRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Stream a JSON export of the audit log within a required date range (max 10000 rows)',
  })
  async export(
    @Query() range: ExportAuditLogsDto,
    @Res() res: Response,
  ): Promise<void> {
    const from = new Date(range.dateFrom);
    const to = new Date(range.dateTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('dateFrom and dateTo must be valid ISO 8601 datetimes');
    }
    if (from > to) {
      throw new BadRequestException('dateFrom must be on or before dateTo');
    }

    const payload = await this.auditRead.exportRange(range);

    // Filename is timestamped down to the second so back-to-back exports
    // do not collide in the operator's downloads folder.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=admin-audit-${stamp}.json`,
    );
    res.status(200).send(JSON.stringify(payload));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a single audit log entry, including before/after state' })
  @ApiOkResponse({ description: 'Full audit entry with metadata, beforeState, afterState.' })
  async detail(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<AuditLogDetail> {
    return this.auditRead.findById(id);
  }
}
