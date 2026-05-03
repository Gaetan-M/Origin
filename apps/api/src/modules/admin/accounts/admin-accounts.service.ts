import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountRole,
  AdminActionSeverity,
  ClaimStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminAuditService } from '../admin-audit.service';
import type { AdminActor } from '../../../common/decorators/admin-actor.decorator';
import { ListAccountsDto } from './dto/list-accounts.dto';
import { UpdateAccountRoleDto } from './dto/update-account-role.dto';
import { BanAccountDto, DeleteAccountDto } from './dto/ban-account.dto';
import { AdminUpdateAccountDto } from './dto/admin-update-account.dto';

/**
 * Numeric rank used for "is X privileged enough to act on Y" comparisons.
 * Mirrors the table in RolesGuard — kept local to avoid a public export
 * the rest of the codebase shouldn't depend on.
 */
const ROLE_RANK: Record<AccountRole, number> = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

const SAFE_ACCOUNT_SELECT = {
  id: true,
  phoneNumber: true,
  phoneCountryCode: true,
  phoneOperator: true,
  email: true,
  fullName: true,
  notes: true,
  languagePreference: true,
  whatsappEnabled: true,
  pinEnabled: true,
  isActive: true,
  isBanned: true,
  bannedReason: true,
  bannedAt: true,
  bannedByAccountId: true,
  role: true,
  roleAssignedAt: true,
  roleAssignedByAccountId: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.AccountSelect;

interface PaginationParams {
  page: number;
  limit: number;
}

@Injectable()
export class AdminAccountsService {
  private readonly logger = new Logger(AdminAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // LIST / DETAIL
  // ---------------------------------------------------------------------------

  async list(query: ListAccountsDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.AccountWhereInput = {};

    if (!query.includeDeleted) {
      where.deletedAt = null;
    }

    if (query.role) {
      where.role = query.role;
    }

    if (typeof query.isBanned === 'boolean') {
      where.isBanned = query.isBanned;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { phoneNumber: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { fullName: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (typeof query.hasClaim === 'boolean') {
      const claimsFilter: Prisma.ClaimListRelationFilter = {
        some: { status: ClaimStatus.VERIFIED },
      };
      where.claims = query.hasClaim ? claimsFilter : { none: { status: ClaimStatus.VERIFIED } };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({
        where,
        select: {
          ...SAFE_ACCOUNT_SELECT,
          _count: {
            select: {
              claims: true,
              personsCreated: true,
              contributions: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.account.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      select: {
        ...SAFE_ACCOUNT_SELECT,
        bannedByAccount: {
          select: { id: true, phoneNumber: true, fullName: true, role: true },
        },
        roleAssignedByAccount: {
          select: { id: true, phoneNumber: true, fullName: true, role: true },
        },
        _count: {
          select: {
            claims: true,
            personsCreated: true,
            personsClaimed: true,
            contributions: true,
            invitationsSent: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // "Last 5 logins" — we infer them from successful OTP verifications
    // for this account's phoneNumber, since there's no dedicated session
    // table. Keep the query small (top 5 verifiedAt desc).
    const lastLogins = await this.prisma.otpRequest.findMany({
      where: { phoneNumber: account.phoneNumber, verified: true },
      select: {
        verifiedAt: true,
        channel: true,
        ipAddress: true,
        deviceId: true,
        createdAt: true,
      },
      orderBy: { verifiedAt: 'desc' },
      take: 5,
    });

    return {
      ...account,
      lastLogins,
    };
  }

  // ---------------------------------------------------------------------------
  // UPDATE PROFILE FIELDS (admin-only)
  // ---------------------------------------------------------------------------

  async updateProfile(id: string, dto: AdminUpdateAccountDto, actor: AdminActor) {
    const existing = await this.prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        deletedAt: true,
        fullName: true,
        email: true,
        notes: true,
      },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Account not found');
    }

    const data: Prisma.AccountUpdateInput = {};
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    if (dto.fullName !== undefined) {
      data.fullName = dto.fullName;
      before.fullName = existing.fullName;
      after.fullName = dto.fullName;
    }
    if (dto.email !== undefined) {
      // Allow null to clear.
      data.email = dto.email === '' ? null : dto.email;
      before.email = existing.email;
      after.email = data.email ?? null;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes;
      before.notes = existing.notes;
      after.notes = dto.notes;
    }

    if (Object.keys(after).length === 0) {
      // Nothing to update — short-circuit, but still return the latest snapshot.
      return this.findOne(id);
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data,
      select: SAFE_ACCOUNT_SELECT,
    });

    await this.auditService.record({
      actor,
      action: 'accounts.update',
      category: 'accounts',
      severity: AdminActionSeverity.INFO,
      targetAccountId: id,
      targetEntityType: 'account',
      targetEntityId: id,
      beforeState: before as Prisma.InputJsonValue,
      afterState: after as Prisma.InputJsonValue,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // ROLE MANAGEMENT
  // ---------------------------------------------------------------------------

  async updateRole(id: string, dto: UpdateAccountRoleDto, actor: AdminActor) {
    const target = await this.prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        deletedAt: true,
        role: true,
        phoneNumber: true,
      },
    });

    if (!target || target.deletedAt) {
      throw new NotFoundException('Account not found');
    }

    const newRole = dto.role;
    const oldRole = target.role;

    if (newRole === oldRole) {
      throw new BadRequestException('Account already has this role');
    }

    // Granting ADMIN or SUPER_ADMIN requires SUPER_ADMIN privileges.
    if (
      (newRole === AccountRole.ADMIN || newRole === AccountRole.SUPER_ADMIN) &&
      actor.role !== AccountRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only a SUPER_ADMIN can grant ADMIN or SUPER_ADMIN roles',
      );
    }

    // Demoting an existing ADMIN or SUPER_ADMIN also requires SUPER_ADMIN.
    if (
      (oldRole === AccountRole.ADMIN || oldRole === AccountRole.SUPER_ADMIN) &&
      actor.role !== AccountRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only a SUPER_ADMIN can change the role of an ADMIN or SUPER_ADMIN',
      );
    }

    // Cannot demote yourself if you are the last remaining SUPER_ADMIN —
    // the system would be left with no super-admin and lose the ability to
    // recover. Count only non-deleted, non-banned super-admins.
    if (
      actor.accountId === id &&
      oldRole === AccountRole.SUPER_ADMIN &&
      newRole !== AccountRole.SUPER_ADMIN
    ) {
      const remaining = await this.prisma.account.count({
        where: {
          role: AccountRole.SUPER_ADMIN,
          deletedAt: null,
          isBanned: false,
          id: { not: id },
        },
      });
      if (remaining === 0) {
        throw new ForbiddenException(
          'Cannot demote yourself: you are the last remaining SUPER_ADMIN',
        );
      }
    }

    const severity: AdminActionSeverity =
      newRole === AccountRole.SUPER_ADMIN
        ? AdminActionSeverity.CRITICAL
        : newRole === AccountRole.ADMIN
        ? AdminActionSeverity.WARNING
        : newRole === AccountRole.MODERATOR
        ? AdminActionSeverity.NOTICE
        : AdminActionSeverity.INFO;

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        role: newRole,
        roleAssignedAt: new Date(),
        roleAssignedByAccountId: actor.accountId,
      },
      select: SAFE_ACCOUNT_SELECT,
    });

    await this.auditService.record({
      actor,
      action: 'accounts.role_change',
      category: 'accounts',
      severity,
      targetAccountId: id,
      targetEntityType: 'account',
      targetEntityId: id,
      reason: dto.reason,
      beforeState: { role: oldRole },
      afterState: { role: newRole },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // BAN / UNBAN
  // ---------------------------------------------------------------------------

  async ban(id: string, dto: BanAccountDto, actor: AdminActor) {
    const target = await this.prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        deletedAt: true,
        role: true,
        isBanned: true,
        bannedReason: true,
        bannedAt: true,
      },
    });

    if (!target || target.deletedAt) {
      throw new NotFoundException('Account not found');
    }

    if (target.isBanned) {
      throw new BadRequestException('Account is already banned');
    }

    // Refuse banning a higher-or-equal role than yourself. Self-ban is
    // also blocked here (rank equal to itself).
    if (ROLE_RANK[target.role] >= ROLE_RANK[actor.role]) {
      throw new ForbiddenException(
        'You cannot ban an account whose role is equal to or higher than yours',
      );
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        isBanned: true,
        bannedReason: dto.reason,
        bannedAt: new Date(),
        bannedByAccountId: actor.accountId,
      },
      select: SAFE_ACCOUNT_SELECT,
    });

    await this.auditService.record({
      actor,
      action: 'accounts.ban',
      category: 'accounts',
      severity: AdminActionSeverity.WARNING,
      targetAccountId: id,
      targetEntityType: 'account',
      targetEntityId: id,
      reason: dto.reason,
      beforeState: { isBanned: false },
      afterState: { isBanned: true, bannedReason: dto.reason },
    });

    return updated;
  }

  async unban(id: string, actor: AdminActor) {
    const target = await this.prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        deletedAt: true,
        isBanned: true,
        bannedReason: true,
        role: true,
      },
    });

    if (!target || target.deletedAt) {
      throw new NotFoundException('Account not found');
    }

    if (!target.isBanned) {
      throw new BadRequestException('Account is not banned');
    }

    // Same rank rule: don't allow lifting a ban on a higher-or-equal role.
    if (ROLE_RANK[target.role] >= ROLE_RANK[actor.role]) {
      throw new ForbiddenException(
        'You cannot unban an account whose role is equal to or higher than yours',
      );
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        isBanned: false,
        bannedReason: null,
        bannedAt: null,
        bannedByAccountId: null,
      },
      select: SAFE_ACCOUNT_SELECT,
    });

    await this.auditService.record({
      actor,
      action: 'accounts.unban',
      category: 'accounts',
      severity: AdminActionSeverity.NOTICE,
      targetAccountId: id,
      targetEntityType: 'account',
      targetEntityId: id,
      beforeState: { isBanned: true, bannedReason: target.bannedReason },
      afterState: { isBanned: false },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // SOFT DELETE / RESTORE
  // ---------------------------------------------------------------------------

  async softDelete(id: string, dto: DeleteAccountDto, actor: AdminActor) {
    const target = await this.prisma.account.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, role: true },
    });

    if (!target) {
      throw new NotFoundException('Account not found');
    }

    if (target.deletedAt) {
      throw new BadRequestException('Account is already deleted');
    }

    if (target.role === AccountRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot delete a SUPER_ADMIN account');
    }

    // Acting on yourself is allowed only if you are not the last super-admin
    // — but we already block deleting any super-admin above, so a regular
    // self-delete here is fine.
    const updated = await this.prisma.account.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: SAFE_ACCOUNT_SELECT,
    });

    await this.auditService.record({
      actor,
      action: 'accounts.delete',
      category: 'accounts',
      severity: AdminActionSeverity.WARNING,
      targetAccountId: id,
      targetEntityType: 'account',
      targetEntityId: id,
      reason: dto.reason,
      beforeState: { deletedAt: null },
      afterState: { deletedAt: updated.deletedAt },
    });

    return updated;
  }

  async restore(id: string, actor: AdminActor) {
    const target = await this.prisma.account.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });

    if (!target) {
      throw new NotFoundException('Account not found');
    }

    if (!target.deletedAt) {
      throw new BadRequestException('Account is not deleted');
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: { deletedAt: null },
      select: SAFE_ACCOUNT_SELECT,
    });

    await this.auditService.record({
      actor,
      action: 'accounts.restore',
      category: 'accounts',
      severity: AdminActionSeverity.NOTICE,
      targetAccountId: id,
      targetEntityType: 'account',
      targetEntityId: id,
      beforeState: { deletedAt: target.deletedAt },
      afterState: { deletedAt: null },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // RELATED LISTS
  // ---------------------------------------------------------------------------

  async listContributions(id: string, pagination: PaginationParams) {
    // Confirm account exists (404 surface) but don't filter by deletedAt —
    // moderators may need to inspect a deleted user's history.
    const account = await this.prisma.account.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const page = Math.max(1, pagination.page);
    const limit = Math.min(100, Math.max(1, pagination.limit));
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contribution.findMany({
        where: { accountId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contribution.count({ where: { accountId: id } }),
    ]);

    return { items, total, page, limit };
  }

  async listAuditTrail(id: string, pagination: PaginationParams) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const page = Math.max(1, pagination.page);
    const limit = Math.min(100, Math.max(1, pagination.limit));
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.adminAuditLog.findMany({
        where: { targetAccountId: id },
        select: {
          id: true,
          actorAccountId: true,
          actorRole: true,
          action: true,
          category: true,
          severity: true,
          targetEntityType: true,
          targetEntityId: true,
          targetAccountId: true,
          reason: true,
          beforeState: true,
          afterState: true,
          metadata: true,
          requestId: true,
          createdAt: true,
          // ipAddress and userAgent are intentionally omitted from list responses.
          actorAccount: {
            select: { id: true, phoneNumber: true, fullName: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.adminAuditLog.count({ where: { targetAccountId: id } }),
    ]);

    return { items, total, page, limit };
  }
}
