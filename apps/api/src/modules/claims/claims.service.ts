import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma, ClaimStatus, NotificationType, VerificationLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateClaimDto, DisputeClaimDto } from './dto/create-claim.dto';

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateClaimDto, accountId: string) {
    // Check person exists
    const person = await this.prisma.person.findUnique({
      where: { id: dto.personId },
    });
    if (!person || person.deletedAt) {
      throw new NotFoundException('Person not found');
    }

    // Prevent claiming if account already has a VERIFIED claim on a different person
    const existingVerifiedClaim = await this.prisma.claim.findFirst({
      where: {
        accountId,
        status: ClaimStatus.VERIFIED,
        personId: { not: dto.personId },
      },
    });
    if (existingVerifiedClaim) {
      throw new ConflictException(
        'You already have a verified claim on another person. Only one verified claim per account is allowed.',
      );
    }

    // Check if this account already has a claim on this person
    const existingClaim = await this.prisma.claim.findUnique({
      where: { accountId_personId: { accountId, personId: dto.personId } },
    });
    if (existingClaim) {
      throw new ConflictException('You already have a claim on this person');
    }

    // Auto-verify if the creator is claiming their own person
    const isCreator = person.createdByAccountId === accountId;

    // If person already has a VERIFIED claim from another account, set status to DISPUTED
    const existingVerifiedClaimOnPerson = await this.prisma.claim.findFirst({
      where: {
        personId: dto.personId,
        status: ClaimStatus.VERIFIED,
        accountId: { not: accountId },
      },
    });

    let initialStatus: ClaimStatus;
    if (isCreator) {
      initialStatus = ClaimStatus.VERIFIED;
    } else if (existingVerifiedClaimOnPerson) {
      initialStatus = ClaimStatus.DISPUTED;
    } else {
      initialStatus = ClaimStatus.PENDING;
    }

    const claim = await this.prisma.claim.create({
      data: {
        accountId,
        personId: dto.personId,
        status: initialStatus,
        verificationLevel: isCreator ? VerificationLevel.SELF_DECLARED : undefined,
        evidence: dto.evidence ?? null,
        disputedByClaimId: existingVerifiedClaimOnPerson?.id ?? null,
        resolvedAt: isCreator ? new Date() : null,
      },
      include: {
        person: { select: { id: true, displayName: true } },
      },
    });

    // If auto-verified, update the person record
    if (isCreator) {
      await this.prisma.person.update({
        where: { id: dto.personId },
        data: {
          claimedByAccountId: accountId,
          claimVerifiedAt: new Date(),
          verificationLevel: VerificationLevel.SELF_DECLARED,
        },
      });
      this.logger.log(`Claim auto-verified (creator): account=${accountId}, person=${dto.personId}`);
    }

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'claim',
        entityId: claim.id,
        action: 'CREATE',
        newValue: {
          personId: dto.personId,
          status: initialStatus,
          autoVerified: isCreator,
        } as unknown as Prisma.JsonObject,
      },
    });

    this.logger.log(`Claim created: account=${accountId}, person=${dto.personId}, status=${initialStatus}`);

    // Notify the stakeholders of the claimed person (creator + current
    // claimer, minus the claimer themselves) so they can validate the
    // request from /claims/pending.
    if (!isCreator) {
      const recipientIds = new Set<string>();
      if (person.createdByAccountId && person.createdByAccountId !== accountId) {
        recipientIds.add(person.createdByAccountId);
      }
      if (person.claimedByAccountId && person.claimedByAccountId !== accountId) {
        recipientIds.add(person.claimedByAccountId);
      }

      const claimerAccount = await this.prisma.account.findUnique({
        where: { id: accountId },
        select: { phoneNumber: true },
      });
      const claimerLabel = claimerAccount?.phoneNumber ?? 'Un utilisateur';

      for (const recipientId of recipientIds) {
        try {
          await this.notifications.createNotification({
            accountId: recipientId,
            notificationType: NotificationType.CLAIM_REQUEST,
            title: `Revendication sur ${person.displayName}`,
            body: `${claimerLabel} affirme être ${person.displayName}. Valide ou conteste cette revendication.`,
            relatedEntityType: 'claim',
            relatedEntityId: claim.id,
            actionUrl: '/claims/pending',
          });
        } catch (err) {
          this.logger.warn(
            `Failed to notify account=${recipientId} about claim=${claim.id}: ${(err as Error).message}`,
          );
        }
      }
    }

    return claim;
  }

  async validate(claimId: string, accountId: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        person: { select: { id: true, displayName: true, claimedByAccountId: true } },
      },
    });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.accountId === accountId) {
      throw new ForbiddenException('You cannot validate your own claim');
    }

    if (claim.status !== ClaimStatus.PENDING && claim.status !== ClaimStatus.PENDING_VERIFICATION) {
      throw new BadRequestException(`Cannot validate a claim with status ${claim.status}`);
    }

    // Prevent double validation
    if (claim.validatedByAccountIds.includes(accountId)) {
      throw new ConflictException('You have already validated this claim');
    }

    const newValidatedBy = [...claim.validatedByAccountIds, accountId];
    const newValidationCount = claim.validationCount + 1;

    // Auto-verify at 3 validations
    const newStatus = newValidationCount >= 3
      ? ClaimStatus.VERIFIED
      : ClaimStatus.PENDING_VERIFICATION;

    const updated = await this.prisma.claim.update({
      where: { id: claimId },
      data: {
        validatedByAccountIds: newValidatedBy,
        validationCount: newValidationCount,
        status: newStatus,
        resolvedAt: newStatus === ClaimStatus.VERIFIED ? new Date() : null,
      },
      include: {
        person: { select: { id: true, displayName: true } },
      },
    });

    // If verified, update the person's claimedByAccountId
    if (newStatus === ClaimStatus.VERIFIED) {
      await this.prisma.person.update({
        where: { id: claim.personId },
        data: {
          claimedByAccountId: claim.accountId,
          claimVerifiedAt: new Date(),
        },
      });
      await this.recalculateVerificationLevel(claim.personId);
    }

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'claim',
        entityId: claimId,
        action: 'VALIDATE',
        newValue: {
          validationCount: newValidationCount,
          status: newStatus,
        } as unknown as Prisma.JsonObject,
      },
    });

    // Tell the claimer their claim moved forward.
    try {
      await this.notifications.createNotification({
        accountId: claim.accountId,
        notificationType: NotificationType.CLAIM_VALIDATED,
        title:
          newStatus === ClaimStatus.VERIFIED
            ? `Revendication acceptee sur ${claim.person.displayName}`
            : `Revendication validee sur ${claim.person.displayName}`,
        body:
          newStatus === ClaimStatus.VERIFIED
            ? 'Tu es maintenant officiellement rattache(e) a ce profil.'
            : `Une validation recue (${newValidationCount} sur 3 necessaires).`,
        relatedEntityType: 'claim',
        relatedEntityId: claimId,
        actionUrl: '/profile',
      });
    } catch (err) {
      this.logger.warn(
        `Failed to notify claimer of claim=${claimId} validation: ${(err as Error).message}`,
      );
    }

    return updated;
  }

  async dispute(claimId: string, dto: DisputeClaimDto, accountId: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.accountId === accountId) {
      throw new ForbiddenException('You cannot dispute your own claim');
    }

    if (claim.status === ClaimStatus.REJECTED) {
      throw new BadRequestException('Cannot dispute a rejected claim');
    }

    const updated = await this.prisma.claim.update({
      where: { id: claimId },
      data: {
        status: ClaimStatus.DISPUTED,
        disputeReason: dto.reason,
      },
      include: {
        person: { select: { id: true, displayName: true } },
      },
    });

    // If the claim was verified, recalculate verification level
    if (claim.status === ClaimStatus.VERIFIED) {
      await this.recalculateVerificationLevel(claim.personId);
    }

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'claim',
        entityId: claimId,
        action: 'DISPUTE',
        newValue: {
          reason: dto.reason,
          previousStatus: claim.status,
        } as unknown as Prisma.JsonObject,
      },
    });

    try {
      await this.notifications.createNotification({
        accountId: claim.accountId,
        notificationType: NotificationType.CLAIM_VALIDATED,
        title: `Revendication contestee sur ${updated.person.displayName}`,
        body: `Raison: ${dto.reason.slice(0, 200)}`,
        relatedEntityType: 'claim',
        relatedEntityId: claimId,
        actionUrl: '/profile',
      });
    } catch (err) {
      this.logger.warn(
        `Failed to notify claimer of dispute on claim=${claimId}: ${(err as Error).message}`,
      );
    }

    return updated;
  }

  async findPending(accountId: string) {
    // Claims on persons related to the current account that need validation
    // Find persons claimed by this account, then find pending claims on related persons
    const claimedPerson = await this.prisma.person.findFirst({
      where: { claimedByAccountId: accountId, deletedAt: null },
    });

    if (!claimedPerson) {
      // If account has no claimed person, return claims directed at persons they created
      return this.prisma.claim.findMany({
        where: {
          status: { in: [ClaimStatus.PENDING, ClaimStatus.PENDING_VERIFICATION] },
          person: { createdByAccountId: accountId, deletedAt: null },
          accountId: { not: accountId },
        },
        include: {
          person: { select: { id: true, displayName: true } },
          account: { select: { id: true, phoneNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Find family members through parent_child relationships
    const familyIds = await this.getFamilyPersonIds(claimedPerson.id);

    return this.prisma.claim.findMany({
      where: {
        status: { in: [ClaimStatus.PENDING, ClaimStatus.PENDING_VERIFICATION] },
        personId: { in: familyIds },
        accountId: { not: accountId },
      },
      include: {
        person: { select: { id: true, displayName: true } },
        account: { select: { id: true, phoneNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMine(accountId: string) {
    return this.prisma.claim.findMany({
      where: { accountId },
      include: {
        person: { select: { id: true, displayName: true, verificationLevel: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(claimId: string, accountId: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.accountId !== accountId) {
      throw new ForbiddenException('You can only cancel your own claims');
    }

    if (claim.status === ClaimStatus.VERIFIED) {
      throw new BadRequestException('Cannot cancel a verified claim. Contact support.');
    }

    await this.prisma.claim.update({
      where: { id: claimId },
      data: {
        status: ClaimStatus.REJECTED,
        resolvedAt: new Date(),
      },
    });

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'claim',
        entityId: claimId,
        action: 'CANCEL',
      },
    });

    return { message: 'Claim cancelled' };
  }

  async recalculateVerificationLevel(personId: string): Promise<void> {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: {
        claims: { where: { status: ClaimStatus.VERIFIED } },
        identityDocuments: { where: { deletedAt: null } },
      },
    });

    if (!person) return;

    let level: VerificationLevel = VerificationLevel.UNVERIFIED;

    const hasVerifiedClaim = person.claims.length > 0;
    const hasVerifiedDoc = person.identityDocuments.some(
      (d) => d.verificationStatus === 'DOCUMENT_VERIFIED' || d.verificationStatus === 'ADMIN_VERIFIED',
    );
    const hasSelfDeclaredDoc = person.identityDocuments.some(
      (d) => d.verificationStatus === 'SELF_DECLARED',
    );
    const hasCommunityVerifiedDoc = person.identityDocuments.some(
      (d) => d.verificationStatus === 'COMMUNITY_VERIFIED',
    );

    if (hasVerifiedDoc) {
      level = VerificationLevel.DOCUMENT_VERIFIED;
    } else if (hasCommunityVerifiedDoc) {
      level = VerificationLevel.COMMUNITY_VERIFIED;
    } else if (hasSelfDeclaredDoc) {
      level = VerificationLevel.DOCUMENT_DECLARED;
    } else if (hasVerifiedClaim) {
      level = VerificationLevel.SELF_DECLARED;
    }

    await this.prisma.person.update({
      where: { id: personId },
      data: { verificationLevel: level },
    });

    this.logger.log(`Verification level recalculated for person=${personId}: ${level}`);
  }

  private async getFamilyPersonIds(personId: string): Promise<string[]> {
    const ids = new Set<string>([personId]);

    // Get parents
    const parentRels = await this.prisma.parentChild.findMany({
      where: { childId: personId, deletedAt: null },
      select: { parentId: true },
    });
    parentRels.forEach((r) => ids.add(r.parentId));

    // Get children
    const childRels = await this.prisma.parentChild.findMany({
      where: { parentId: personId, deletedAt: null },
      select: { childId: true },
    });
    childRels.forEach((r) => ids.add(r.childId));

    // Get siblings (children of same parents)
    const parentIds = parentRels.map((r) => r.parentId);
    if (parentIds.length > 0) {
      const siblingRels = await this.prisma.parentChild.findMany({
        where: { parentId: { in: parentIds }, deletedAt: null },
        select: { childId: true },
      });
      siblingRels.forEach((r) => ids.add(r.childId));
    }

    // Get spouses
    const partnerEntries = await this.prisma.unionPartner.findMany({
      where: { personId },
      select: { unionId: true },
    });
    const unionIds = partnerEntries.map((p) => p.unionId);
    if (unionIds.length > 0) {
      const spouseEntries = await this.prisma.unionPartner.findMany({
        where: { unionId: { in: unionIds }, personId: { not: personId } },
        select: { personId: true },
      });
      spouseEntries.forEach((s) => ids.add(s.personId));
    }

    return Array.from(ids);
  }
}
