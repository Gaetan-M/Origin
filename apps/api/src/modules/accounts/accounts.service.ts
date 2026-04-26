import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdatePinDto } from './dto/update-pin.dto';

const scryptAsync = promisify(scrypt);

interface PaginationParams {
  page: number;
  limit: number;
}

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        phoneNumber: true,
        phoneCountryCode: true,
        phoneOperator: true,
        pinEnabled: true,
        languagePreference: true,
        dataSaverMode: true,
        largeTextMode: true,
        email: true,
        whatsappEnabled: true,
        isActive: true,
        isBanned: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!account || account.deletedAt) {
      throw new NotFoundException('Account not found');
    }

    // Remove deletedAt from response
    const { deletedAt: _, ...result } = account;
    return result;
  }

  async findByPhone(phoneNumber: string) {
    const account = await this.prisma.account.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        phoneCountryCode: true,
        phoneOperator: true,
        pinEnabled: true,
        languagePreference: true,
        dataSaverMode: true,
        largeTextMode: true,
        email: true,
        whatsappEnabled: true,
        isActive: true,
        isBanned: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!account || account.deletedAt) {
      throw new NotFoundException('Account not found');
    }

    // Remove deletedAt from response
    const { deletedAt: _, ...result } = account;
    return result;
  }

  async update(id: string, dto: UpdateAccountDto) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        deletedAt: true,
        languagePreference: true,
        dataSaverMode: true,
        largeTextMode: true,
        email: true,
        whatsappEnabled: true,
      },
    });

    if (!account || account.deletedAt) {
      throw new NotFoundException('Account not found');
    }

    // Build old values for audit trail
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};

    if (dto.languagePreference !== undefined) {
      oldValue.languagePreference = account.languagePreference;
      newValue.languagePreference = dto.languagePreference;
    }
    if (dto.dataSaverMode !== undefined) {
      oldValue.dataSaverMode = account.dataSaverMode;
      newValue.dataSaverMode = dto.dataSaverMode;
    }
    if (dto.largeTextMode !== undefined) {
      oldValue.largeTextMode = account.largeTextMode;
      newValue.largeTextMode = dto.largeTextMode;
    }
    if (dto.email !== undefined) {
      oldValue.email = account.email;
      newValue.email = dto.email;
    }
    if (dto.whatsappEnabled !== undefined) {
      oldValue.whatsappEnabled = account.whatsappEnabled;
      newValue.whatsappEnabled = dto.whatsappEnabled;
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.languagePreference !== undefined && { languagePreference: dto.languagePreference }),
        ...(dto.dataSaverMode !== undefined && { dataSaverMode: dto.dataSaverMode }),
        ...(dto.largeTextMode !== undefined && { largeTextMode: dto.largeTextMode }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.whatsappEnabled !== undefined && { whatsappEnabled: dto.whatsappEnabled }),
      },
      select: {
        id: true,
        phoneNumber: true,
        phoneCountryCode: true,
        phoneOperator: true,
        pinEnabled: true,
        languagePreference: true,
        dataSaverMode: true,
        largeTextMode: true,
        email: true,
        whatsappEnabled: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Audit trail
    if (Object.keys(newValue).length > 0) {
      await this.prisma.contribution.create({
        data: {
          accountId: id,
          entityType: 'account',
          entityId: id,
          action: 'UPDATE',
          oldValue: oldValue as unknown as Prisma.JsonObject,
          newValue: newValue as unknown as Prisma.JsonObject,
        },
      });
    }

    this.logger.log(`Account updated: ${id}`);
    return updated;
  }

  async setPin(accountId: string, dto: UpdatePinDto) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, deletedAt: true, pinEnabled: true, pinHash: true },
    });

    if (!account || account.deletedAt) {
      throw new NotFoundException('Account not found');
    }

    // If PIN is already set, verify current PIN first
    if (account.pinEnabled && account.pinHash) {
      if (!dto.currentPin) {
        throw new BadRequestException('Current PIN is required to change an existing PIN');
      }
      const isValid = await this.verifyPin(dto.currentPin, account.pinHash);
      if (!isValid) {
        throw new UnauthorizedException('Current PIN is incorrect');
      }
    }

    const pinHash = await this.hashPin(dto.newPin);

    await this.prisma.account.update({
      where: { id: accountId },
      data: {
        pinHash,
        pinEnabled: true,
      },
    });

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'account',
        entityId: accountId,
        action: account.pinEnabled ? 'PIN_CHANGED' : 'PIN_SET',
        newValue: { pinEnabled: true } as unknown as Prisma.JsonObject,
      },
    });

    this.logger.log(`PIN ${account.pinEnabled ? 'changed' : 'set'} for account: ${accountId}`);
    return { message: account.pinEnabled ? 'PIN changed successfully' : 'PIN set successfully' };
  }

  async removePin(accountId: string, currentPin: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, deletedAt: true, pinEnabled: true, pinHash: true },
    });

    if (!account || account.deletedAt) {
      throw new NotFoundException('Account not found');
    }

    if (!account.pinEnabled || !account.pinHash) {
      throw new BadRequestException('No PIN is currently set');
    }

    const isValid = await this.verifyPin(currentPin, account.pinHash);
    if (!isValid) {
      throw new UnauthorizedException('Current PIN is incorrect');
    }

    await this.prisma.account.update({
      where: { id: accountId },
      data: {
        pinHash: null,
        pinEnabled: false,
      },
    });

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'account',
        entityId: accountId,
        action: 'PIN_REMOVED',
        newValue: { pinEnabled: false } as unknown as Prisma.JsonObject,
      },
    });

    this.logger.log(`PIN removed for account: ${accountId}`);
    return { message: 'PIN removed successfully' };
  }

  async softDelete(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, deletedAt: true },
    });

    if (!account || account.deletedAt) {
      throw new NotFoundException('Account not found');
    }

    await this.prisma.account.update({
      where: { id: accountId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'account',
        entityId: accountId,
        action: 'DELETE',
      },
    });

    this.logger.log(`Account soft deleted: ${accountId}`);
    return { message: 'Account deleted successfully' };
  }

  async getContributions(accountId: string, pagination: PaginationParams) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, deletedAt: true },
    });

    if (!account || account.deletedAt) {
      throw new NotFoundException('Account not found');
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [contributions, total] = await Promise.all([
      this.prisma.contribution.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          entityType: true,
          entityId: true,
          action: true,
          fieldName: true,
          oldValue: true,
          newValue: true,
          note: true,
          createdAt: true,
        },
      }),
      this.prisma.contribution.count({
        where: { accountId },
      }),
    ]);

    return {
      data: contributions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Aggregate stats for the dashboard. Everything is scoped to persons the
   * account created (the natural ownership boundary), with one extra block
   * for the requester's claimed Person used to derive "tree" facts.
   *
   * Implementation note: we issue ~10 small queries in parallel rather than
   * one big rollup so each piece can be cached/reused and Prisma can pick its
   * own indexes. None of these scan more than the account's own rows.
   */
  async getStats(accountId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const ownPersonsWhere = { createdByAccountId: accountId, deletedAt: null };

    const [
      total,
      byLifeStatus,
      byGender,
      withPhoto,
      withPhone,
      withBirth,
      birthYearAgg,
      topVillagesRaw,
      monthlyAdditionsRaw,
      invitationsSent,
      invitationsConsumed,
      familyCodesActive,
      familyCodeRedemptionsAgg,
      myClaim,
      unreadNotifications,
    ] = await Promise.all([
      this.prisma.person.count({ where: ownPersonsWhere }),
      this.prisma.person.groupBy({
        by: ['lifeStatus'],
        where: ownPersonsWhere,
        _count: { _all: true },
      }),
      this.prisma.person.groupBy({
        by: ['gender'],
        where: ownPersonsWhere,
        _count: { _all: true },
      }),
      this.prisma.person.count({ where: { ...ownPersonsWhere, hasPhoto: true } }),
      this.prisma.person.count({ where: { ...ownPersonsWhere, phoneNumber: { not: null } } }),
      this.prisma.person.count({
        where: {
          ...ownPersonsWhere,
          OR: [{ birthDate: { not: null } }, { birthYearApproximate: { not: null } }],
        },
      }),
      this.prisma.person.aggregate({
        where: { ...ownPersonsWhere, birthYearApproximate: { not: null } },
        _min: { birthYearApproximate: true },
        _max: { birthYearApproximate: true },
      }),
      this.prisma.person.groupBy({
        by: ['villageOrigin'],
        where: { ...ownPersonsWhere, villageOrigin: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { villageOrigin: 'desc' } },
        take: 5,
      }),
      this.prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
        SELECT date_trunc('month', created_at) AS month, COUNT(*)::bigint AS count
        FROM persons
        WHERE created_by_account_id = ${accountId}::uuid
          AND deleted_at IS NULL
          AND created_at >= ${sixMonthsAgo}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.invitationToken.count({ where: { inviterAccountId: accountId } }),
      this.prisma.invitationToken.count({
        where: { inviterAccountId: accountId, usedAt: { not: null } },
      }),
      this.prisma.familyCode.count({
        where: {
          accountId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.familyCode.aggregate({
        where: { accountId },
        _sum: { usedCount: true },
      }),
      this.prisma.claim.findFirst({
        where: { accountId, status: 'VERIFIED' },
        select: {
          person: {
            select: {
              id: true,
              displayName: true,
              parentsOf: { where: { deletedAt: null }, select: { childId: true } },
              childrenOf: { where: { deletedAt: null }, select: { parentId: true } },
              unionPartners: {
                select: { unionId: true },
              },
            },
          },
        },
      }),
      this.prisma.notification.count({ where: { accountId, isRead: false } }),
    ]);

    const lifeStatus = {
      alive: byLifeStatus.find((g) => g.lifeStatus === 'ALIVE')?._count._all ?? 0,
      deceased: byLifeStatus.find((g) => g.lifeStatus === 'DECEASED')?._count._all ?? 0,
      unknown: byLifeStatus.find((g) => g.lifeStatus === 'UNKNOWN')?._count._all ?? 0,
    };
    const gender = {
      male: byGender.find((g) => g.gender === 'M')?._count._all ?? 0,
      female: byGender.find((g) => g.gender === 'F')?._count._all ?? 0,
      other: byGender.find((g) => g.gender === 'O')?._count._all ?? 0,
      unknown: byGender.filter((g) => !g.gender || g.gender === 'U').reduce((a, g) => a + g._count._all, 0),
    };

    const minYear = birthYearAgg._min.birthYearApproximate ?? null;
    const maxYear = birthYearAgg._max.birthYearApproximate ?? null;
    const generationSpan =
      minYear && maxYear ? Math.max(1, Math.round((maxYear - minYear) / 25)) : 0;

    // Build a contiguous 6-month window so the chart never has gaps.
    const months: Array<{ month: string; count: number }> = [];
    const monthMap = new Map(
      monthlyAdditionsRaw.map((r) => [
        new Date(r.month).toISOString().slice(0, 7),
        Number(r.count),
      ]),
    );
    const cursor = new Date(sixMonthsAgo);
    for (let i = 0; i < 6; i++) {
      const key = cursor.toISOString().slice(0, 7);
      months.push({ month: key, count: monthMap.get(key) ?? 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return {
      persons: {
        total,
        ...lifeStatus,
        ...gender,
        withPhoto,
        withPhone,
        withBirth,
        birthYearMin: minYear,
        birthYearMax: maxYear,
        generationSpan,
      },
      tree: myClaim?.person
        ? {
            claimedPersonId: myClaim.person.id,
            claimedPersonName: myClaim.person.displayName,
            childrenCount: myClaim.person.parentsOf.length,
            parentsCount: myClaim.person.childrenOf.length,
            unionsCount: myClaim.person.unionPartners.length,
          }
        : null,
      invitations: {
        sent: invitationsSent,
        consumed: invitationsConsumed,
        pending: invitationsSent - invitationsConsumed,
      },
      familyCodes: {
        active: familyCodesActive,
        totalRedemptions: familyCodeRedemptionsAgg._sum.usedCount ?? 0,
      },
      topVillages: topVillagesRaw
        .filter((v) => v.villageOrigin)
        .map((v) => ({ village: v.villageOrigin as string, count: v._count._all })),
      additionsByMonth: months,
      notifications: { unread: unreadNotifications },
    };
  }

  private async hashPin(pin: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scryptAsync(pin, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  private async verifyPin(pin: string, storedHash: string): Promise<boolean> {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) {
      return false;
    }
    const derivedKey = (await scryptAsync(pin, salt, 64)) as Buffer;
    const storedKey = Buffer.from(hash, 'hex');
    return timingSafeEqual(derivedKey, storedKey);
  }
}
