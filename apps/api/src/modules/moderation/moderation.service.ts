import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountRole,
  AdminActionSeverity,
  ModerationReportStatus,
  ModerationStatus,
  ModerationTargetType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../admin/admin-audit.service';
import { AdminActor } from '../../common/decorators/admin-actor.decorator';

const MODERATOR_ROLES: ReadonlySet<AccountRole> = new Set<AccountRole>([
  AccountRole.MODERATOR,
  AccountRole.ADMIN,
  AccountRole.SUPER_ADMIN,
]);

/** Maps the public-facing decision strings onto the Prisma enum. */
const CONTENT_DECISION: Record<'APPROVED' | 'REJECTED', ModerationStatus> = {
  APPROVED: ModerationStatus.APPROVED,
  REJECTED: ModerationStatus.REJECTED,
};

const REPORT_RESOLUTION: Record<
  'RESOLVED' | 'DISMISSED',
  ModerationReportStatus
> = {
  RESOLVED: ModerationReportStatus.RESOLVED,
  DISMISSED: ModerationReportStatus.DISMISSED,
};

export interface ReportInput {
  reporterAccountId: string;
  targetType: ModerationTargetType;
  targetId: string;
  reason: string;
  details?: string | null;
}

/**
 * Phase-2 PUBLIC-world moderation backend.
 *
 * Drives the cultural-heritage discovery feed's safety surface: community
 * reporting, the moderator review queue, content verdicts, and verification
 * of cultural authorities (chefferies / experts / institutions).
 *
 * Every privileged action writes an AdminAuditLog (who/what/why) AND a
 * Contribution row (entity-level audit trail), per the project's
 * audit-everything rule. No family-graph data ever flows through here.
 */
@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  // ----------------------------------------------------------------
  // Reporting — open to any authenticated account.
  // ----------------------------------------------------------------

  /**
   * Flag a piece of public content. Idempotent-ish: if the same reporter
   * already has an OPEN/REVIEWING report against the same target, the
   * existing report is returned instead of creating a duplicate.
   */
  async report(input: ReportInput): Promise<{ id: string; status: ModerationReportStatus }> {
    const existing = await this.prisma.moderationReport.findFirst({
      where: {
        reporterAccountId: input.reporterAccountId,
        targetType: input.targetType,
        targetId: input.targetId,
        status: {
          in: [ModerationReportStatus.OPEN, ModerationReportStatus.REVIEWING],
        },
      },
      select: { id: true, status: true },
    });

    if (existing) {
      return existing;
    }

    const created = await this.prisma.moderationReport.create({
      data: {
        reporterAccountId: input.reporterAccountId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details ?? null,
        status: ModerationReportStatus.OPEN,
      },
      select: { id: true, status: true },
    });

    return created;
  }

  // ----------------------------------------------------------------
  // Queue — moderator+ only.
  // ----------------------------------------------------------------

  /**
   * Lists reports still needing attention (OPEN or REVIEWING), oldest first
   * so the queue is processed fairly (FIFO).
   */
  async queue(
    actor: AdminActor,
    options: { take?: number; skip?: number } = {},
  ): Promise<
    Array<{
      id: string;
      targetType: ModerationTargetType;
      targetId: string;
      reason: string;
      details: string | null;
      status: ModerationReportStatus;
      createdAt: Date;
    }>
  > {
    this.assertModerator(actor.role);

    return this.prisma.moderationReport.findMany({
      where: {
        status: {
          in: [ModerationReportStatus.OPEN, ModerationReportStatus.REVIEWING],
        },
      },
      orderBy: { createdAt: 'asc' },
      take: options.take ?? 50,
      skip: options.skip ?? 0,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
      },
    });
  }

  // ----------------------------------------------------------------
  // Cultural content verdict — moderator+ only.
  // ----------------------------------------------------------------

  async moderateCulturalContent(
    contentId: string,
    decision: 'APPROVED' | 'REJECTED',
    actor: AdminActor,
  ): Promise<{ id: string; moderationStatus: ModerationStatus }> {
    this.assertModerator(actor.role);

    const content = await this.prisma.culturalContent.findFirst({
      where: { id: contentId, deletedAt: null },
      select: { id: true, moderationStatus: true, authorAccountId: true },
    });

    if (!content) {
      throw new NotFoundException('Cultural content not found');
    }

    const nextStatus = CONTENT_DECISION[decision];

    const updated = await this.prisma.culturalContent.update({
      where: { id: contentId },
      data: { moderationStatus: nextStatus },
      select: { id: true, moderationStatus: true },
    });

    await this.audit.record({
      actor,
      action:
        decision === 'APPROVED'
          ? 'cultural_content.approve'
          : 'cultural_content.reject',
      category: 'moderation',
      severity:
        decision === 'APPROVED'
          ? AdminActionSeverity.INFO
          : AdminActionSeverity.NOTICE,
      targetEntityType: 'cultural_content',
      targetEntityId: contentId,
      targetAccountId: content.authorAccountId,
      beforeState: { moderationStatus: content.moderationStatus },
      afterState: { moderationStatus: nextStatus },
    });

    await this.writeContribution({
      accountId: actor.accountId,
      entityType: 'cultural_content',
      entityId: contentId,
      action: 'MODERATE',
      fieldName: 'moderation_status',
      oldValue: { moderationStatus: content.moderationStatus },
      newValue: { moderationStatus: nextStatus },
    });

    return updated;
  }

  // ----------------------------------------------------------------
  // Authority verification — moderator+ only.
  // ----------------------------------------------------------------

  async verifyAuthority(
    authorityId: string,
    verified: boolean,
    actor: AdminActor,
    reason?: string | null,
  ): Promise<{ id: string; verified: boolean }> {
    this.assertModerator(actor.role);

    const authority = await this.prisma.culturalAuthority.findFirst({
      where: { id: authorityId, deletedAt: null },
      select: { id: true, verified: true, accountId: true },
    });

    if (!authority) {
      throw new NotFoundException('Cultural authority not found');
    }

    const now = new Date();
    const updated = await this.prisma.culturalAuthority.update({
      where: { id: authorityId },
      data: {
        verified,
        verifiedAt: verified ? now : null,
        verifiedByAccountId: verified ? actor.accountId : null,
      },
      select: { id: true, verified: true },
    });

    await this.audit.record({
      actor,
      action: verified
        ? 'cultural_authority.verify'
        : 'cultural_authority.unverify',
      category: 'moderation',
      severity: AdminActionSeverity.NOTICE,
      targetEntityType: 'cultural_authority',
      targetEntityId: authorityId,
      targetAccountId: authority.accountId,
      reason: reason ?? null,
      beforeState: { verified: authority.verified },
      afterState: { verified },
    });

    await this.writeContribution({
      accountId: actor.accountId,
      entityType: 'cultural_authority',
      entityId: authorityId,
      action: verified ? 'VERIFY' : 'UNVERIFY',
      fieldName: 'verified',
      oldValue: { verified: authority.verified },
      newValue: { verified },
    });

    return updated;
  }

  // ----------------------------------------------------------------
  // Report resolution — moderator+ only.
  // ----------------------------------------------------------------

  async resolveReport(
    reportId: string,
    status: 'RESOLVED' | 'DISMISSED',
    resolution: string | null,
    actor: AdminActor,
  ): Promise<{ id: string; status: ModerationReportStatus }> {
    this.assertModerator(actor.role);

    const report = await this.prisma.moderationReport.findUnique({
      where: { id: reportId },
      select: { id: true, status: true, targetType: true, targetId: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const nextStatus = REPORT_RESOLUTION[status];

    const updated = await this.prisma.moderationReport.update({
      where: { id: reportId },
      data: {
        status: nextStatus,
        resolution: resolution ?? null,
        resolvedByAccountId: actor.accountId,
        resolvedAt: new Date(),
      },
      select: { id: true, status: true },
    });

    await this.audit.record({
      actor,
      action: 'moderation_report.resolve',
      category: 'moderation',
      severity: AdminActionSeverity.INFO,
      targetEntityType: 'moderation_report',
      targetEntityId: reportId,
      reason: resolution ?? null,
      beforeState: { status: report.status },
      afterState: { status: nextStatus },
      metadata: {
        targetType: report.targetType,
        targetId: report.targetId,
      },
    });

    await this.writeContribution({
      accountId: actor.accountId,
      entityType: 'moderation_report',
      entityId: reportId,
      action: 'RESOLVE',
      fieldName: 'status',
      oldValue: { status: report.status },
      newValue: { status: nextStatus },
      note: resolution ?? undefined,
    });

    return updated;
  }

  // ----------------------------------------------------------------
  // Internals
  // ----------------------------------------------------------------

  /**
   * Defence-in-depth: the controller already gates these routes with
   * RolesGuard, but we re-check here so the service is safe to call from
   * other modules / handlers that may not pass through HTTP guards.
   */
  private assertModerator(role: AccountRole): void {
    if (!MODERATOR_ROLES.has(role)) {
      throw new ForbiddenException('Moderator privileges required');
    }
  }

  private async writeContribution(input: {
    accountId: string;
    entityType: string;
    entityId: string;
    action: string;
    fieldName?: string;
    oldValue?: Prisma.JsonObject;
    newValue?: Prisma.JsonObject;
    note?: string;
  }): Promise<void> {
    try {
      await this.prisma.contribution.create({
        data: {
          accountId: input.accountId,
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          fieldName: input.fieldName ?? null,
          oldValue: input.oldValue
            ? (input.oldValue as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          newValue: input.newValue
            ? (input.newValue as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          note: input.note ?? null,
        },
      });
    } catch (err) {
      // Contribution is an audit side-effect; the moderation action is
      // already committed. Log and move on rather than failing the request.
      this.logger.error(
        `Failed to write contribution (${input.action} ${input.entityType}): ${
          (err as Error).message
        }`,
      );
    }
  }
}
