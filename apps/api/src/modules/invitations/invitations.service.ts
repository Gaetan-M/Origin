import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInvitationDto, accountId: string) {
    // Validate that at least one target is provided
    if (!dto.targetPersonId && !dto.targetPhoneNumber) {
      throw new BadRequestException(
        'At least one of targetPersonId or targetPhoneNumber must be provided',
      );
    }

    // If targetPersonId is provided, verify the person exists
    if (dto.targetPersonId) {
      const person = await this.prisma.person.findUnique({
        where: { id: dto.targetPersonId },
      });
      if (!person || person.deletedAt) {
        throw new NotFoundException('Target person not found');
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

    // Audit trail
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

    return {
      id: invitation.id,
      token: invitation.token,
      targetPerson: invitation.targetPerson,
      targetPhoneNumber: invitation.targetPhoneNumber,
      relationshipHint: invitation.relationshipHint,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
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
      inviterPhone: invitation.inviterAccount.phoneNumber.replace(
        /(\+\d{3})\d+(\d{3})$/,
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

    // Audit trail
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

    this.logger.log(`Invitation consumed: token=${token.substring(0, 8)}..., by account=${accountId}`);

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
