import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly notifications: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateInvitationDto, accountId: string) {
    if (!dto.targetPersonId && !dto.targetPhoneNumber) {
      throw new BadRequestException(
        'At least one of targetPersonId or targetPhoneNumber must be provided',
      );
    }

    if (dto.targetPersonId) {
      const person = await this.prisma.person.findUnique({
        where: { id: dto.targetPersonId },
      });
      if (!person || person.deletedAt) {
        throw new NotFoundException('Target person not found');
      }
    }

    // Block self-invite: if A enters their own phone we must reject — would
    // both be confusing and would let A spam-confirm any pending action.
    if (dto.targetPhoneNumber) {
      const inviter = await this.prisma.account.findUnique({
        where: { id: accountId },
        select: { phoneNumber: true },
      });
      if (inviter?.phoneNumber === dto.targetPhoneNumber) {
        throw new BadRequestException('You cannot invite yourself');
      }
    }

    const token = this.generateToken();

    const invitation = await this.prisma.invitationToken.create({
      data: {
        token,
        inviterAccountId: accountId,
        targetPersonId: dto.targetPersonId ?? null,
        targetPhoneNumber: dto.targetPhoneNumber ?? null,
        relationshipHint: dto.relationshipHint ?? null,
      },
      include: {
        targetPerson: { select: { id: true, displayName: true } },
      },
    });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'invitation',
        entityId: invitation.id,
        action: 'CREATE',
        newValue: {
          targetPersonId: dto.targetPersonId,
          targetPhoneNumber: dto.targetPhoneNumber,
          relationshipHint: dto.relationshipHint,
        } as unknown as Prisma.JsonObject,
      },
    });

    this.logger.log(`Invitation created by account=${accountId}, token=${token.substring(0, 8)}...`);

    // Fire-and-forget SMS/WhatsApp delivery so a Twilio outage cannot block
    // the API call. The user can always copy the link from the invitation list.
    if (dto.targetPhoneNumber) {
      void this.deliverInvitationSms(
        accountId,
        invitation.token,
        dto.targetPhoneNumber,
        dto.relationshipHint ?? null,
      ).catch((err) =>
        this.logger.error(
          `Invitation SMS to ${dto.targetPhoneNumber?.substring(0, 7)}**** failed: ${(err as Error).message}`,
        ),
      );
    }

    return {
      id: invitation.id,
      token: invitation.token,
      inviteUrl: this.buildInviteUrl(invitation.token),
      targetPerson: invitation.targetPerson,
      targetPhoneNumber: invitation.targetPhoneNumber,
      relationshipHint: invitation.relationshipHint,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }

  private async deliverInvitationSms(
    inviterAccountId: string,
    token: string,
    targetPhone: string,
    relationshipHint: string | null,
  ): Promise<void> {
    const inviter = await this.prisma.account.findUnique({
      where: { id: inviterAccountId },
      select: {
        phoneNumber: true,
        languagePreference: true,
        personsClaimed: {
          where: { deletedAt: null },
          select: { displayName: true },
          take: 1,
        },
      },
    });
    if (!inviter) return;

    const inviterDisplay =
      inviter.personsClaimed[0]?.displayName ??
      `${inviter.phoneNumber.substring(0, 7)}****`;
    const language = inviter.languagePreference === 'en' ? 'en' : 'fr';

    await this.messaging.sendInvitation({
      toPhoneNumber: targetPhone,
      inviterDisplay,
      relationshipHint,
      inviteUrl: this.buildInviteUrl(token),
      language,
    });
  }

  private buildInviteUrl(token: string): string {
    const base = this.configService.get<string>('webAppUrl', 'http://localhost:3001');
    return `${base.replace(/\/$/, '')}/join?invite=${token}`;
  }

  async verify(token: string) {
    const invitation = await this.prisma.invitationToken.findUnique({
      where: { token },
      include: {
        inviterAccount: { select: { id: true, phoneNumber: true } },
        targetPerson: { select: { id: true, displayName: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.usedAt) {
      throw new BadRequestException('This invitation has already been used');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('This invitation has expired');
    }

    return {
      valid: true,
      relationshipHint: invitation.relationshipHint,
      targetPerson: invitation.targetPerson,
      // Pre-fillable on the receiver's login screen — only the recipient
      // can know their own number, so leaking it through this endpoint is OK.
      targetPhoneNumber: invitation.targetPhoneNumber,
      inviterPhone: invitation.inviterAccount.phoneNumber.replace(
        /(\+\d{1,3})\d+(\d{3})$/,
        '$1****$2',
      ),
      expiresAt: invitation.expiresAt,
    };
  }

  async consume(token: string, accountId: string) {
    const invitation = await this.prisma.invitationToken.findUnique({
      where: { token },
      include: {
        targetPerson: { select: { id: true, displayName: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.usedAt) {
      throw new BadRequestException('This invitation has already been used');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('This invitation has expired');
    }

    if (invitation.inviterAccountId === accountId) {
      throw new BadRequestException('You cannot consume your own invitation');
    }

    const updated = await this.prisma.invitationToken.update({
      where: { id: invitation.id },
      data: {
        usedAt: new Date(),
        usedByAccountId: accountId,
      },
      include: {
        targetPerson: { select: { id: true, displayName: true } },
      },
    });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'invitation',
        entityId: invitation.id,
        action: 'CONSUME',
        newValue: {
          usedByAccountId: accountId,
        } as unknown as Prisma.JsonObject,
      },
    });

    this.logger.log(
      `Invitation consumed: token=${token.substring(0, 8)}..., by account=${accountId}`,
    );

    // Notify the inviter so they get a real-time signal that their invitation
    // landed. NEW_FAMILY_MEMBER is the closest existing type — semantically
    // someone joined (their family on the platform). pushExternal so it goes
    // out via WhatsApp/SMS too if the inviter is offline.
    const consumer = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        phoneNumber: true,
        personsClaimed: {
          where: { deletedAt: null },
          select: { id: true, displayName: true },
          take: 1,
        },
      },
    });
    const consumerDisplay =
      consumer?.personsClaimed[0]?.displayName ??
      `${consumer?.phoneNumber.substring(0, 7) ?? '+'}****`;
    const consumerPersonId = consumer?.personsClaimed[0]?.id;

    void this.notifications
      .createNotification({
        accountId: invitation.inviterAccountId,
        notificationType: 'NEW_FAMILY_MEMBER',
        title: 'Invitation acceptee',
        body: `${consumerDisplay} vient de rejoindre Origin via ton invitation.`,
        relatedEntityType: 'account',
        relatedEntityId: accountId,
        actionUrl: consumerPersonId ? `/persons/${consumerPersonId}` : '/dashboard',
        pushExternal: true,
      })
      .catch((err) =>
        this.logger.error(`consume-notification failed: ${(err as Error).message}`),
      );

    return {
      id: updated.id,
      targetPerson: updated.targetPerson,
      relationshipHint: updated.relationshipHint,
      usedAt: updated.usedAt,
    };
  }

  async findMine(accountId: string) {
    return this.prisma.invitationToken.findMany({
      where: { inviterAccountId: accountId },
      include: {
        targetPerson: { select: { id: true, displayName: true } },
        usedByAccount: { select: { id: true, phoneNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(invitationId: string, accountId: string) {
    const invitation = await this.prisma.invitationToken.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.inviterAccountId !== accountId) {
      throw new ForbiddenException('You can only cancel your own invitations');
    }

    if (invitation.usedAt) {
      throw new BadRequestException('Cannot cancel an already used invitation');
    }

    await this.prisma.invitationToken.delete({
      where: { id: invitationId },
    });

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'invitation',
        entityId: invitationId,
        action: 'DELETE',
      },
    });

    return { message: 'Invitation cancelled' };
  }

  private generateToken(): string {
    return randomBytes(48).toString('base64url').substring(0, 64);
  }
}
