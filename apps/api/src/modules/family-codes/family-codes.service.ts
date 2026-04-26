import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateFamilyCodeDto } from './dto/create-family-code.dto';
import { RedeemFamilyCodeDto } from './dto/redeem-family-code.dto';

// Avoid visually-confusable letters and digits when reading aloud or by hand.
const SAFE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_GENERATION_ATTEMPTS = 5;

@Injectable()
export class FamilyCodesService {
  private readonly logger = new Logger(FamilyCodesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateFamilyCodeDto, accountId: string) {
    const inviter = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        personsClaimed: {
          where: { deletedAt: null },
          select: { displayName: true },
          take: 1,
        },
      },
    });

    const expiryDays = dto.expiryDays ?? 90;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const code = await this.generateUniqueCode(
      inviter?.personsClaimed[0]?.displayName ?? null,
    );

    const familyCode = await this.prisma.familyCode.create({
      data: {
        code,
        accountId,
        label: dto.label ?? null,
        maxUses: dto.maxUses ?? 50,
        expiresAt,
      },
    });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'family_code',
        entityId: familyCode.id,
        action: 'CREATE',
        newValue: { code: familyCode.code, label: dto.label } as unknown as Prisma.JsonObject,
      },
    });

    this.logger.log(`Family code created: code=${code}, account=${accountId}`);

    return familyCode;
  }

  async findMine(accountId: string) {
    return this.prisma.familyCode.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { uses: true } },
      },
    });
  }

  async findUses(codeId: string, accountId: string) {
    const code = await this.prisma.familyCode.findUnique({
      where: { id: codeId },
      select: { id: true, accountId: true, code: true, label: true },
    });
    if (!code) throw new NotFoundException('Family code not found');
    if (code.accountId !== accountId) {
      throw new ForbiddenException('You can only see uses of your own codes');
    }
    const uses = await this.prisma.familyCodeUse.findMany({
      where: { familyCodeId: codeId },
      orderBy: { usedAt: 'desc' },
      include: {
        usedByAccount: {
          select: {
            id: true,
            phoneNumber: true,
            personsClaimed: {
              where: { deletedAt: null },
              select: { id: true, displayName: true },
              take: 1,
            },
          },
        },
      },
    });
    return {
      code: { id: code.id, code: code.code, label: code.label },
      uses: uses.map((u) => ({
        id: u.id,
        usedAt: u.usedAt,
        account: {
          id: u.usedByAccount.id,
          phoneNumber: u.usedByAccount.phoneNumber.replace(
            /(\+\d{1,3})\d+(\d{3})$/,
            '$1****$2',
          ),
          displayName: u.usedByAccount.personsClaimed[0]?.displayName ?? null,
        },
      })),
    };
  }

  async revoke(id: string, accountId: string) {
    const familyCode = await this.prisma.familyCode.findUnique({ where: { id } });
    if (!familyCode) throw new NotFoundException('Family code not found');
    if (familyCode.accountId !== accountId) {
      throw new ForbiddenException('You can only revoke your own codes');
    }
    if (familyCode.revokedAt) {
      return familyCode;
    }

    return this.prisma.familyCode.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async redeem(dto: RedeemFamilyCodeDto, accountId: string) {
    const normalized = dto.code.toUpperCase().trim();

    const familyCode = await this.prisma.familyCode.findUnique({
      where: { code: normalized },
      include: {
        account: {
          select: {
            id: true,
            phoneNumber: true,
            personsClaimed: {
              where: { deletedAt: null },
              select: { displayName: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!familyCode) {
      throw new NotFoundException('Family code not found');
    }

    if (familyCode.revokedAt) {
      throw new BadRequestException('This code has been revoked');
    }

    if (new Date() > familyCode.expiresAt) {
      throw new BadRequestException('This code has expired');
    }

    if (familyCode.accountId === accountId) {
      throw new BadRequestException('You cannot redeem your own code');
    }

    // Atomic redeem inside one transaction. The conditional updateMany ensures
    // only one concurrent caller can grab the last available slot — others get
    // zero rows updated and bail out. The unique (familyCodeId, accountId) on
    // FamilyCodeUse independently blocks the same account from claiming twice.
    // If anything throws inside the transaction, all writes are rolled back.
    let updatedCode;
    try {
      updatedCode = await this.prisma.$transaction(async (tx) => {
        const updateResult = await tx.familyCode.updateMany({
          where: {
            id: familyCode.id,
            revokedAt: null,
            expiresAt: { gt: new Date() },
            usedCount: { lt: familyCode.maxUses },
          },
          data: { usedCount: { increment: 1 } },
        });
        if (updateResult.count === 0) {
          throw new BadRequestException('This code has reached its maximum redemptions');
        }

        await tx.familyCodeUse.create({
          data: {
            familyCodeId: familyCode.id,
            usedByAccountId: accountId,
          },
        });

        return tx.familyCode.findUniqueOrThrow({ where: { id: familyCode.id } });
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException('You have already redeemed this code');
      }
      throw err;
    }

    const requester = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        phoneNumber: true,
        personsClaimed: {
          where: { deletedAt: null },
          select: { displayName: true },
          take: 1,
        },
      },
    });
    const requesterDisplay =
      requester?.personsClaimed[0]?.displayName ??
      `${requester?.phoneNumber.substring(0, 7) ?? '+237'}****`;

    await this.notifications.createNotification({
      accountId: familyCode.accountId,
      notificationType: 'FAMILY_CODE_REDEEMED',
      title: 'Quelqu\'un a utilise ton code famille',
      body: `${requesterDisplay} vient d'entrer ton code famille "${familyCode.code}". Tu peux maintenant le placer dans ton arbre.`,
      relatedEntityType: 'account',
      relatedEntityId: accountId,
      actionUrl: `/family-codes/${familyCode.id}/uses`,
      pushExternal: true,
    });

    return {
      redeemed: true,
      familyCode: {
        id: updatedCode.id,
        code: updatedCode.code,
        label: updatedCode.label,
      },
      generator: {
        accountId: familyCode.account.id,
        displayName:
          familyCode.account.personsClaimed[0]?.displayName ??
          familyCode.account.phoneNumber.replace(/(\+\d{3})\d+(\d{3})$/, '$1****$2'),
      },
    };
  }

  private async generateUniqueCode(seed: string | null): Promise<string> {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const code = this.buildCode(seed);
      const existing = await this.prisma.familyCode.findUnique({ where: { code } });
      if (!existing) return code;
    }
    throw new Error('Failed to generate a unique family code after several attempts');
  }

  private buildCode(seed: string | null): string {
    const prefix = this.derivePrefix(seed);
    const suffix = String(randomInt(1000, 9999));
    return `${prefix}-${suffix}`;
  }

  private derivePrefix(seed: string | null): string {
    if (seed) {
      const cleaned = seed
        .toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Z]/g, '');
      if (cleaned.length >= 4) {
        return cleaned.substring(0, 6);
      }
    }
    let prefix = '';
    for (let i = 0; i < 6; i++) {
      prefix += SAFE_LETTERS[randomInt(0, SAFE_LETTERS.length)];
    }
    return prefix;
  }
}
