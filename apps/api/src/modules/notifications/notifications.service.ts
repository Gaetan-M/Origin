import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';

interface CreateNotificationParams {
  accountId: string;
  notificationType: NotificationType;
  title: string;
  body?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  channels?: string[];
  /**
   * When true, also push the notification out as a WhatsApp/SMS message to
   * the recipient's phone (WhatsApp first with SMS fallback). Use for
   * actionable notifications the user must see promptly. Fire-and-forget —
   * delivery failure does not block the in-app record.
   */
  pushExternal?: boolean;
}

interface PaginationParams {
  page: number;
  limit: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  async findAll(accountId: string, pagination: PaginationParams) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { accountId },
      }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markRead(notificationId: string, accountId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.accountId !== accountId) {
      throw new ForbiddenException('You can only mark your own notifications as read');
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllRead(accountId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        accountId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { message: `${result.count} notifications marked as read` };
  }

  async getUnreadCount(accountId: string) {
    const count = await this.prisma.notification.count({
      where: {
        accountId,
        isRead: false,
      },
    });

    return { unreadCount: count };
  }

  async createNotification(params: CreateNotificationParams) {
    const channels = params.channels ?? (params.pushExternal ? ['push', 'whatsapp', 'sms'] : ['push']);
    const notification = await this.prisma.notification.create({
      data: {
        accountId: params.accountId,
        notificationType: params.notificationType,
        title: params.title,
        body: params.body ?? null,
        relatedEntityType: params.relatedEntityType ?? null,
        relatedEntityId: params.relatedEntityId ?? null,
        actionUrl: params.actionUrl ?? null,
        channels,
        sentAt: new Date(),
      },
    });

    this.logger.log(
      `Notification created: type=${params.notificationType}, account=${params.accountId}`,
    );

    if (params.pushExternal) {
      void this.pushExternal(params).catch((err) =>
        this.logger.error(
          `External push failed for notification ${notification.id}: ${(err as Error).message}`,
        ),
      );
    }

    return notification;
  }

  private async pushExternal(params: CreateNotificationParams): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id: params.accountId },
      select: { phoneNumber: true, isActive: true, isBanned: true, deletedAt: true },
    });

    if (!account || account.deletedAt || !account.isActive || account.isBanned) {
      this.logger.debug(
        `Skipping external push: account ${params.accountId} not deliverable`,
      );
      return;
    }

    const message = this.buildMessageBody(params);
    const result = await this.messaging.sendWithFallback(account.phoneNumber, message);

    this.logger.log(
      `External push for ${params.notificationType} → ${result.delivered ? `delivered via ${result.channel}` : 'not delivered'} (attempts: ${result.attempts.map((a) => `${a.channel}=${a.ok ? 'ok' : a.errorCode ?? 'fail'}`).join(', ')})`,
    );
  }

  private buildMessageBody(params: CreateNotificationParams): string {
    const parts = [params.title];
    if (params.body) parts.push(params.body);
    if (params.actionUrl) {
      const baseUrl = process.env.WEB_APP_URL || 'http://localhost:3001';
      const url = params.actionUrl.startsWith('http')
        ? params.actionUrl
        : `${baseUrl.replace(/\/$/, '')}${params.actionUrl}`;
      parts.push(`Voir : ${url}`);
    }
    const full = parts.join(' — ');
    // Cap at 1200 chars to stay well within SMS multi-segment limits.
    return full.length > 1200 ? full.slice(0, 1197) + '...' : full;
  }
}
