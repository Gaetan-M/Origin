import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { KinshipProbeDto } from './dto/kinship-probe.dto';

const PROBES_PER_DAY_LIMIT = 5;
const PROBES_PER_HOUR_LIMIT = 2;

@Injectable()
export class KinshipProbeService {
  private readonly logger = new Logger(KinshipProbeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Returns probe context (requester display, claimed relationship, optional
   * message) for the responder. The responder MUST already have a probe
   * notification in their inbox from this requester — this prevents arbitrary
   * accounts from being read by holding any UUID.
   */
  async getIncoming(requesterAccountId: string, responderAccountId: string) {
    if (requesterAccountId === responderAccountId) {
      throw new ForbiddenException('Cannot probe yourself');
    }

    const notif = await this.prisma.notification.findFirst({
      where: {
        accountId: responderAccountId,
        notificationType: 'KINSHIP_PROBE_RECEIVED',
        relatedEntityType: 'account',
        relatedEntityId: requesterAccountId,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!notif) {
      throw new ForbiddenException('No probe found for this requester');
    }

    const requester = await this.prisma.account.findUnique({
      where: { id: requesterAccountId },
      select: {
        id: true,
        phoneNumber: true,
        isActive: true,
        isBanned: true,
        deletedAt: true,
        personsClaimed: {
          where: { deletedAt: null },
          select: { displayName: true, villageOrigin: true },
          take: 1,
        },
      },
    });
    if (!requester || requester.deletedAt || !requester.isActive || requester.isBanned) {
      throw new NotFoundException('Requester is no longer reachable');
    }

    return {
      notificationId: notif.id,
      receivedAt: notif.createdAt,
      message: notif.body,
      requester: {
        id: requester.id,
        phoneNumber: requester.phoneNumber,
        displayName: requester.personsClaimed[0]?.displayName ?? null,
        villageOrigin: requester.personsClaimed[0]?.villageOrigin ?? null,
      },
    };
  }

  async submit(dto: KinshipProbeDto, requesterAccountId: string) {
    if (await this.isSelfPhone(requesterAccountId, dto.targetPhoneNumber)) {
      throw new BadRequestException('You cannot probe your own phone number');
    }

    await this.checkRateLimit(requesterAccountId);

    await this.prisma.contribution.create({
      data: {
        accountId: requesterAccountId,
        entityType: 'kinship_probe',
        entityId: requesterAccountId,
        action: 'CREATE',
        newValue: {
          targetPhoneNumber: dto.targetPhoneNumber,
          claimedRelationship: dto.claimedRelationship ?? null,
          hasMessage: !!dto.message,
        } as unknown as Prisma.JsonObject,
      },
    });

    const target = await this.prisma.account.findUnique({
      where: { phoneNumber: dto.targetPhoneNumber },
      select: { id: true, isActive: true, isBanned: true, deletedAt: true },
    });

    if (!target || target.deletedAt || !target.isActive || target.isBanned) {
      // Privacy: do NOT reveal whether the target exists. Always return same generic response.
      this.logger.debug(
        `Kinship probe to non-existent/inactive account from ${requesterAccountId}`,
      );
      return this.genericResponse();
    }

    const requester = await this.prisma.account.findUnique({
      where: { id: requesterAccountId },
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

    const relationLine = dto.claimedRelationship
      ? ` se presentant comme ton/ta ${dto.claimedRelationship}`
      : '';
    const messageLine = dto.message ? `\nMessage : "${dto.message}"` : '';

    await this.notifications.createNotification({
      accountId: target.id,
      notificationType: 'KINSHIP_PROBE_RECEIVED',
      title: 'Une personne dit te connaitre',
      body: `${requesterDisplay}${relationLine} demande a se connecter avec toi sur Origin.${messageLine}`,
      relatedEntityType: 'account',
      relatedEntityId: requesterAccountId,
      actionUrl: `/kinship-probe/respond?from=${requesterAccountId}`,
      pushExternal: true,
    });

    return this.genericResponse();
  }

  private async isSelfPhone(accountId: string, phone: string): Promise<boolean> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { phoneNumber: true },
    });
    return account?.phoneNumber === phone;
  }

  private async checkRateLimit(accountId: string): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const dailyCount = await this.prisma.contribution.count({
      where: {
        accountId,
        entityType: 'kinship_probe',
        action: 'CREATE',
        createdAt: { gte: oneDayAgo },
      },
    });
    if (dailyCount >= PROBES_PER_DAY_LIMIT) {
      throw new ForbiddenException(
        `Daily kinship-probe limit reached (${PROBES_PER_DAY_LIMIT}). Try again tomorrow.`,
      );
    }

    const hourlyCount = await this.prisma.contribution.count({
      where: {
        accountId,
        entityType: 'kinship_probe',
        action: 'CREATE',
        createdAt: { gte: oneHourAgo },
      },
    });
    if (hourlyCount >= PROBES_PER_HOUR_LIMIT) {
      throw new ForbiddenException(
        `Hourly kinship-probe limit reached (${PROBES_PER_HOUR_LIMIT}). Wait a bit.`,
      );
    }
  }

  private genericResponse() {
    return {
      submitted: true,
      message:
        'Si cette personne est inscrite sur Origin, elle recevra ta demande de mise en relation.',
    };
  }
}
