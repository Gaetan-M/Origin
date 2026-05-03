import { Injectable, Logger } from '@nestjs/common';
import { AccountRole, AdminActionSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AdminActorContext {
  accountId: string;
  role: AccountRole;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export interface RecordAdminActionInput {
  actor: AdminActorContext;
  action: string;
  category: string;
  severity?: AdminActionSeverity;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  targetAccountId?: string | null;
  reason?: string | null;
  beforeState?: Prisma.InputJsonValue | null;
  afterState?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
}

/**
 * Append-only audit trail for every admin action.
 *
 * - Never throws into the caller path: a failed log entry must not roll
 *   back the underlying privileged action (the action already happened).
 * - Truncate giant `before/after` payloads at the call site, not here —
 *   we want a faithful record of what was actually persisted.
 */
@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAdminActionInput): Promise<void> {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          actorAccountId: input.actor.accountId,
          actorRole: input.actor.role,
          action: input.action,
          category: input.category,
          severity: input.severity ?? AdminActionSeverity.INFO,
          targetEntityType: input.targetEntityType ?? null,
          targetEntityId: input.targetEntityId ?? null,
          targetAccountId: input.targetAccountId ?? null,
          reason: input.reason ?? null,
          beforeState: input.beforeState ?? Prisma.JsonNull,
          afterState: input.afterState ?? Prisma.JsonNull,
          metadata: input.metadata ?? Prisma.JsonNull,
          ipAddress: input.actor.ipAddress ?? null,
          userAgent: input.actor.userAgent ?? null,
          requestId: input.actor.requestId ?? null,
        },
      });
    } catch (err) {
      // We deliberately swallow — admin actions are already committed
      // by the time we get here; a missed audit entry is logged so it
      // can be picked up via observability rather than blowing up the
      // request.
      this.logger.error(
        `Failed to write admin audit log (${input.action}): ${(err as Error).message}`,
      );
    }
  }
}
