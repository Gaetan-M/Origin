import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountRole, AdminActionSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExportAuditLogsDto, ListAuditLogsDto } from './dto/list-audit-logs.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const EXPORT_HARD_CAP = 10000;

export interface AuditActorPreview {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  role: AccountRole;
}

export interface AuditTargetAccountPreview {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  role: AccountRole;
}

export interface AuditLogListItem {
  id: string;
  action: string;
  category: string;
  severity: AdminActionSeverity;
  actorAccountId: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  targetAccountId: string | null;
  reason: string | null;
  ipAddress: string | null;
  createdAt: Date;
  actor: AuditActorPreview;
  targetAccount: AuditTargetAccountPreview | null;
}

export interface AuditLogDetail extends AuditLogListItem {
  beforeState: Prisma.JsonValue | null;
  afterState: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  userAgent: string | null;
  requestId: string | null;
  actorRole: AccountRole;
}

export interface PaginatedAuditLogs {
  items: AuditLogListItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Read-only service powering the admin audit dashboard.
 *
 * Mutating writes go through the @Global AdminAuditService in the parent
 * directory — this class deliberately exposes no `record()` method so
 * read paths can never accidentally append to the trail.
 */
@Injectable()
export class AdminAuditReadService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mask a stored phone number for display.
   *
   * Format: keep the country prefix (`+237`) plus the next 3 chars, hide
   * the middle, and reveal the last 2. Falls back gracefully when the
   * stored value is shorter than expected so we never crash a list view
   * over malformed legacy data.
   */
  static maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return phoneNumber;
    const prefixMatch = phoneNumber.match(/^(\+\d{1,3})(.*)$/);
    const prefix = prefixMatch ? prefixMatch[1] : '';
    const rest = prefixMatch ? prefixMatch[2] : phoneNumber;

    if (rest.length <= 5) {
      // Too short to safely partial-mask — hide the middle entirely.
      return `${prefix}${rest.slice(0, 1)}*${rest.slice(-1)}`;
    }
    const head = rest.slice(0, 3);
    const tail = rest.slice(-2);
    return `${prefix}${head}*${tail}`;
  }

  async list(query: ListAuditLogsDto): Promise<PaginatedAuditLogs> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where = this.buildWhere(query);

    const [rawItems, total] = await this.prisma.$transaction([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          category: true,
          severity: true,
          actorAccountId: true,
          targetEntityType: true,
          targetEntityId: true,
          targetAccountId: true,
          reason: true,
          ipAddress: true,
          createdAt: true,
          actorAccount: {
            select: { id: true, phoneNumber: true, fullName: true, role: true },
          },
          targetAccount: {
            select: { id: true, phoneNumber: true, fullName: true, role: true },
          },
        },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    const items: AuditLogListItem[] = rawItems.map((row) => ({
      id: row.id,
      action: row.action,
      category: row.category,
      severity: row.severity,
      actorAccountId: row.actorAccountId,
      targetEntityType: row.targetEntityType,
      targetEntityId: row.targetEntityId,
      targetAccountId: row.targetAccountId,
      reason: row.reason,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt,
      actor: {
        id: row.actorAccount.id,
        phoneNumber: AdminAuditReadService.maskPhoneNumber(row.actorAccount.phoneNumber),
        fullName: row.actorAccount.fullName,
        role: row.actorAccount.role,
      },
      targetAccount: row.targetAccount
        ? {
            id: row.targetAccount.id,
            phoneNumber: AdminAuditReadService.maskPhoneNumber(row.targetAccount.phoneNumber),
            fullName: row.targetAccount.fullName,
            role: row.targetAccount.role,
          }
        : null,
    }));

    return { items, total, page, limit };
  }

  async findById(id: string): Promise<AuditLogDetail> {
    const row = await this.prisma.adminAuditLog.findUnique({
      where: { id },
      include: {
        actorAccount: {
          select: { id: true, phoneNumber: true, fullName: true, role: true },
        },
        targetAccount: {
          select: { id: true, phoneNumber: true, fullName: true, role: true },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Audit log entry not found');
    }

    return {
      id: row.id,
      action: row.action,
      category: row.category,
      severity: row.severity,
      actorAccountId: row.actorAccountId,
      actorRole: row.actorRole,
      targetEntityType: row.targetEntityType,
      targetEntityId: row.targetEntityId,
      targetAccountId: row.targetAccountId,
      reason: row.reason,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      requestId: row.requestId,
      beforeState: row.beforeState,
      afterState: row.afterState,
      metadata: row.metadata,
      createdAt: row.createdAt,
      actor: {
        id: row.actorAccount.id,
        phoneNumber: AdminAuditReadService.maskPhoneNumber(row.actorAccount.phoneNumber),
        fullName: row.actorAccount.fullName,
        role: row.actorAccount.role,
      },
      targetAccount: row.targetAccount
        ? {
            id: row.targetAccount.id,
            phoneNumber: AdminAuditReadService.maskPhoneNumber(row.targetAccount.phoneNumber),
            fullName: row.targetAccount.fullName,
            role: row.targetAccount.role,
          }
        : null,
    };
  }

  /**
   * Distinct category values currently present in the table, sorted
   * alphabetically. Used by the dashboard to populate filter dropdowns
   * without hard-coding the catalogue.
   */
  async listCategories(): Promise<string[]> {
    const rows = await this.prisma.adminAuditLog.findMany({
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }

  /**
   * Returns up to {@link EXPORT_HARD_CAP} rows in createdAt ASC order
   * within `[dateFrom, dateTo]`. Caller is responsible for streaming the
   * result to the HTTP response.
   */
  async exportRange(
    range: ExportAuditLogsDto,
  ): Promise<{ exportedAt: string; dateFrom: string; dateTo: string; total: number; truncated: boolean; items: AuditLogDetail[] }> {
    const where: Prisma.AdminAuditLogWhereInput = {
      createdAt: {
        gte: new Date(range.dateFrom),
        lte: new Date(range.dateTo),
      },
    };

    const rows = await this.prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: EXPORT_HARD_CAP,
      include: {
        actorAccount: {
          select: { id: true, phoneNumber: true, fullName: true, role: true },
        },
        targetAccount: {
          select: { id: true, phoneNumber: true, fullName: true, role: true },
        },
      },
    });

    const items: AuditLogDetail[] = rows.map((row) => ({
      id: row.id,
      action: row.action,
      category: row.category,
      severity: row.severity,
      actorAccountId: row.actorAccountId,
      actorRole: row.actorRole,
      targetEntityType: row.targetEntityType,
      targetEntityId: row.targetEntityId,
      targetAccountId: row.targetAccountId,
      reason: row.reason,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      requestId: row.requestId,
      beforeState: row.beforeState,
      afterState: row.afterState,
      metadata: row.metadata,
      createdAt: row.createdAt,
      actor: {
        id: row.actorAccount.id,
        phoneNumber: AdminAuditReadService.maskPhoneNumber(row.actorAccount.phoneNumber),
        fullName: row.actorAccount.fullName,
        role: row.actorAccount.role,
      },
      targetAccount: row.targetAccount
        ? {
            id: row.targetAccount.id,
            phoneNumber: AdminAuditReadService.maskPhoneNumber(row.targetAccount.phoneNumber),
            fullName: row.targetAccount.fullName,
            role: row.targetAccount.role,
          }
        : null,
    }));

    return {
      exportedAt: new Date().toISOString(),
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      total: items.length,
      truncated: items.length === EXPORT_HARD_CAP,
      items,
    };
  }

  private buildWhere(query: ListAuditLogsDto): Prisma.AdminAuditLogWhereInput {
    const where: Prisma.AdminAuditLogWhereInput = {};

    if (query.actorAccountId) where.actorAccountId = query.actorAccountId;
    if (query.targetAccountId) where.targetAccountId = query.targetAccountId;
    if (query.targetEntityType) where.targetEntityType = query.targetEntityType;
    if (query.targetEntityId) where.targetEntityId = query.targetEntityId;
    if (query.severity) where.severity = query.severity;

    if (query.category) {
      // Substring match so callers can pass either a top-level prefix
      // ("moderation") or a leaf path ("merge.approve").
      where.category = { contains: query.category, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    return where;
  }
}
