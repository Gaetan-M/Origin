import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, LifeStatus, ClaimStatus, VerificationLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { MatchOnSignupService } from '../matching/match-on-signup.service';
import { MessagingService } from '../messaging/messaging.service';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

@Injectable()
export class PersonsService {
  private readonly logger = new Logger(PersonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly matchOnSignup: MatchOnSignupService,
    private readonly messaging: MessagingService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreatePersonDto, accountId: string) {
    this.validateDeceasedCoherence(dto);

    const normalizedName = await this.normalizeName(dto.displayName);

    const person = await this.prisma.person.create({
      data: {
        displayName: dto.displayName,
        normalizedName,
        gender: dto.gender,
        lifeStatus: dto.lifeStatus,
        deceasedAssumed: dto.deceasedAssumed ?? false,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        birthDatePrecision: dto.birthDatePrecision,
        birthYearApproximate: dto.birthYearApproximate,
        birthDateText: dto.birthDateText,
        deceasedDate: dto.deceasedDate ? new Date(dto.deceasedDate) : null,
        deceasedDatePrecision: dto.deceasedDatePrecision,
        deceasedYearApproximate: dto.deceasedYearApproximate,
        deceasedDateText: dto.deceasedDateText,
        birthPlace: dto.birthPlace,
        birthRegion: dto.birthRegion,
        birthCountry: dto.birthCountry ?? 'Cameroun',
        deceasedPlace: dto.deceasedPlace,
        currentResidencePlace: dto.currentResidencePlace,
        currentResidenceCountry: dto.currentResidenceCountry,
        ethnicity: dto.ethnicity,
        villageOrigin: dto.villageOrigin,
        chefferie: dto.chefferie,
        biography: dto.biography,
        occupation: dto.occupation,
        phoneNumber: dto.phoneNumber,
        isPublic: dto.isPublic ?? false,
        createdByAccountId: accountId,
        updatedByAccountId: accountId,
        names: dto.names
          ? {
              create: dto.names.map((n) => ({
                nameType: n.nameType,
                fullName: n.fullName,
                firstName: n.firstName,
                lastName: n.lastName,
                middleNames: n.middleNames,
                normalizedFullName: n.fullName.toLowerCase().trim(),
                isPrimary: n.isPrimary ?? false,
              })),
            }
          : undefined,
      },
      include: { names: true },
    });

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'person',
        entityId: person.id,
        action: 'CREATE',
        newValue: { displayName: dto.displayName, lifeStatus: dto.lifeStatus } as unknown as Prisma.JsonObject,
      },
    });

    // Auto-SMS invitation when adding someone else's fiche with their phone number.
    // We fire-and-forget so a Twilio failure does not break the create call.
    if (dto.phoneNumber && !dto.isSelf) {
      void this.maybeSendInvitationSms(person.id, dto.phoneNumber, accountId).catch((err) =>
        this.logger.error(
          `auto-invitation-sms failed: ${(err as Error).message}`,
        ),
      );
    }

    // Auto-claim if isSelf is true
    if (dto.isSelf) {
      // Check no existing verified claim on another person
      const existingVerified = await this.prisma.claim.findFirst({
        where: { accountId, status: ClaimStatus.VERIFIED },
      });
      if (!existingVerified) {
        await this.prisma.claim.create({
          data: {
            accountId,
            personId: person.id,
            status: ClaimStatus.VERIFIED,
            verificationLevel: VerificationLevel.SELF_DECLARED,
            resolvedAt: new Date(),
          },
        });
        await this.prisma.person.update({
          where: { id: person.id },
          data: {
            claimedByAccountId: accountId,
            claimVerifiedAt: new Date(),
            verificationLevel: VerificationLevel.SELF_DECLARED,
          },
        });
        this.logger.log(`Person ${person.id} auto-claimed by creator ${accountId}`);

        // Fire-and-forget — notify any inviter whose ghost fiche resembles this self person.
        void this.matchOnSignup
          .runSimilarityMatchForSelf(accountId, person.id)
          .catch((err) =>
            this.logger.error(
              `similarity-match-for-self failed: ${(err as Error).message}`,
            ),
          );
      }
    }

    return person;
  }

  async findByAccount(
    accountId: string,
    pagination: { page: number; limit: number } = { page: 1, limit: 50 },
  ) {
    const page = Math.max(1, pagination.page);
    const limit = Math.min(100, Math.max(1, pagination.limit));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.person.findMany({
        where: {
          createdByAccountId: accountId,
          deletedAt: null,
        },
        select: {
          id: true,
          displayName: true,
          gender: true,
          lifeStatus: true,
          hasPhoto: true,
          primaryPhotoId: true,
          birthDate: true,
          birthDatePrecision: true,
          birthYearApproximate: true,
          birthPlace: true,
          villageOrigin: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.person.count({
        where: { createdByAccountId: accountId, deletedAt: null },
      }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, accountId?: string) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: {
        names: true,
        parentsOf: {
          where: { deletedAt: null },
          include: { child: { select: { id: true, displayName: true, lifeStatus: true } } },
        },
        childrenOf: {
          where: { deletedAt: null },
          include: { parent: { select: { id: true, displayName: true, lifeStatus: true } } },
        },
        unionPartners: {
          include: {
            union: {
              include: {
                partners: {
                  include: { person: { select: { id: true, displayName: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!person || person.deletedAt) {
      throw new NotFoundException('Person not found');
    }
    if (accountId && !(await this.canView(person, accountId))) {
      // 404 (not 403) so we don't reveal that a non-visible person exists.
      throw new NotFoundException('Person not found');
    }

    return person;
  }

  /**
   * Visibility policy:
   *   - public, OR
   *   - created by the requester, OR
   *   - claimed by the requester, OR
   *   - within 3 degrees of the requester's claimed Person (uses
   *     get_family_neighborhood SQL function — same one /family-tree relies on).
   * Anything else is treated as not-visible.
   */
  async canView(
    person: { id: string; isPublic: boolean; createdByAccountId: string | null; claimedByAccountId: string | null },
    accountId: string,
  ): Promise<boolean> {
    if (person.isPublic) return true;
    if (person.createdByAccountId === accountId) return true;
    if (person.claimedByAccountId === accountId) return true;

    const myClaim = await this.prisma.claim.findFirst({
      where: { accountId, status: 'VERIFIED' },
      select: { personId: true },
    });
    if (!myClaim) return false;
    if (myClaim.personId === person.id) return true;

    try {
      const rows = await this.prisma.$queryRaw<Array<{ exists: number }>>`
        SELECT 1 AS exists
        FROM get_family_neighborhood(${myClaim.personId}::uuid, 3)
        WHERE person_id = ${person.id}::uuid
        LIMIT 1
      `;
      return Array.isArray(rows) && rows.length > 0;
    } catch {
      return false;
    }
  }

  async update(id: string, dto: UpdatePersonDto, accountId: string) {
    const person = await this.prisma.person.findUnique({ where: { id } });
    if (!person || person.deletedAt) {
      throw new NotFoundException('Person not found');
    }

    // Authz: only the creator OR the claimer of the fiche may modify it.
    // Anyone else gets a 403 — no info leak about who owns it (we already
    // confirmed existence with the 404 above, which is acceptable since
    // the caller typically discovered the id through search/dashboard).
    if (person.createdByAccountId !== accountId && person.claimedByAccountId !== accountId) {
      throw new ForbiddenException('You cannot modify this person');
    }

    this.validateDeceasedCoherence(dto);

    const normalizedName = dto.displayName
      ? await this.normalizeName(dto.displayName)
      : undefined;

    const updated = await this.prisma.person.update({
      where: { id },
      data: {
        ...(dto.displayName && { displayName: dto.displayName }),
        ...(normalizedName && { normalizedName }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        lifeStatus: dto.lifeStatus,
        ...(dto.deceasedAssumed !== undefined && { deceasedAssumed: dto.deceasedAssumed }),
        ...(dto.birthDate !== undefined && { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }),
        ...(dto.birthDatePrecision && { birthDatePrecision: dto.birthDatePrecision }),
        ...(dto.birthYearApproximate !== undefined && { birthYearApproximate: dto.birthYearApproximate }),
        ...(dto.birthDateText !== undefined && { birthDateText: dto.birthDateText }),
        ...(dto.deceasedDate !== undefined && { deceasedDate: dto.deceasedDate ? new Date(dto.deceasedDate) : null }),
        ...(dto.deceasedDatePrecision && { deceasedDatePrecision: dto.deceasedDatePrecision }),
        ...(dto.deceasedYearApproximate !== undefined && { deceasedYearApproximate: dto.deceasedYearApproximate }),
        ...(dto.deceasedDateText !== undefined && { deceasedDateText: dto.deceasedDateText }),
        ...(dto.birthPlace !== undefined && { birthPlace: dto.birthPlace }),
        ...(dto.birthRegion !== undefined && { birthRegion: dto.birthRegion }),
        ...(dto.birthCountry !== undefined && { birthCountry: dto.birthCountry }),
        ...(dto.deceasedPlace !== undefined && { deceasedPlace: dto.deceasedPlace }),
        ...(dto.currentResidencePlace !== undefined && {
          currentResidencePlace: dto.currentResidencePlace,
        }),
        ...(dto.currentResidenceCountry !== undefined && {
          currentResidenceCountry: dto.currentResidenceCountry,
        }),
        ...(dto.ethnicity !== undefined && { ethnicity: dto.ethnicity }),
        ...(dto.villageOrigin !== undefined && { villageOrigin: dto.villageOrigin }),
        ...(dto.chefferie !== undefined && { chefferie: dto.chefferie }),
        ...(dto.biography !== undefined && { biography: dto.biography }),
        ...(dto.occupation !== undefined && { occupation: dto.occupation }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        updatedByAccountId: accountId,
      },
      include: { names: true },
    });

    // Audit trail
    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'person',
        entityId: id,
        action: 'UPDATE',
        oldValue: { lifeStatus: person.lifeStatus } as unknown as Prisma.JsonObject,
        newValue: { lifeStatus: dto.lifeStatus } as unknown as Prisma.JsonObject,
      },
    });

    return updated;
  }

  async softDelete(id: string, accountId: string) {
    const person = await this.prisma.person.findUnique({ where: { id } });
    if (!person || person.deletedAt) {
      throw new NotFoundException('Person not found');
    }

    if (person.createdByAccountId !== accountId) {
      throw new ForbiddenException('Only the creator can delete this person');
    }

    await this.prisma.person.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'person',
        entityId: id,
        action: 'DELETE',
      },
    });

    return { message: 'Person deleted' };
  }

  async getFamilyTree(personId: string, degrees: number = 2, accountId?: string) {
    const person = await this.prisma.person.findUnique({ where: { id: personId } });
    if (!person || person.deletedAt) {
      throw new NotFoundException('Person not found');
    }
    if (accountId && !(await this.canView(person, accountId))) {
      throw new NotFoundException('Person not found');
    }

    const neighbors = await this.prisma.$queryRaw<
      Array<{ person_id: string; relationship_label: string; degree: number; path: string[] }>
    >`SELECT * FROM get_family_neighborhood(${personId}::uuid, ${degrees}::integer)`;

    const neighborIds = neighbors.map((n) => n.person_id);
    const persons =
      neighborIds.length > 0
        ? await this.prisma.person.findMany({
            where: { id: { in: neighborIds }, deletedAt: null },
            select: {
              id: true,
              displayName: true,
              gender: true,
              lifeStatus: true,
              hasPhoto: true,
              birthDate: true,
              birthYearApproximate: true,
              primaryPhotoId: true,
            },
          })
        : [];

    const personMap = new Map(persons.map((p) => [p.id, p]));

    // Conjugal links are sourced ONLY from the Union table. A union is
    // semantically a marriage (or equivalent declared bond) — sharing a
    // child is not a union, and we never infer one from parent_child rows
    // or from graph-traversal paths. To see Papa ↔ Mama on the tree, a
    // union between them must be declared explicitly through the UI.
    const allIdSet = new Set<string>([personId, ...neighborIds]);
    const allIdArray = Array.from(allIdSet);

    const rawUnions = await this.prisma.union.findMany({
      where: {
        deletedAt: null,
        partners: { some: { personId: { in: allIdArray } } },
      },
      select: {
        id: true,
        partners: { select: { personId: true } },
      },
    });

    const unions: Array<{
      unionId: string;
      personAId: string;
      personBId: string;
    }> = [];
    const seenPairs = new Set<string>();
    for (const u of rawUnions) {
      const inTree = u.partners
        .map((p) => p.personId)
        .filter((id) => allIdSet.has(id));
      if (inTree.length < 2) continue;
      const key = [inTree[0], inTree[1]].sort().join('|');
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      unions.push({
        unionId: u.id,
        personAId: inTree[0],
        personBId: inTree[1],
      });
    }

    return {
      center: {
        id: person.id,
        displayName: person.displayName,
        gender: person.gender,
        lifeStatus: person.lifeStatus,
        primaryPhotoId: person.primaryPhotoId,
        hasPhoto: person.hasPhoto,
        birthDate: person.birthDate,
        birthYearApproximate: person.birthYearApproximate,
      },
      neighbors: neighbors.map((n) => ({
        personId: n.person_id,
        relationshipLabel: n.relationship_label,
        degree: n.degree,
        path: n.path,
        person: personMap.get(n.person_id) || null,
      })),
      unions,
    };
  }

  private validateDeceasedCoherence(dto: { lifeStatus: LifeStatus; deceasedDate?: string; deceasedYearApproximate?: number; deceasedDateText?: string; deceasedAssumed?: boolean }): void {
    if (dto.lifeStatus === LifeStatus.DECEASED) {
      const hasDeceasedInfo =
        dto.deceasedDate ||
        dto.deceasedYearApproximate ||
        dto.deceasedDateText ||
        dto.deceasedAssumed;

      if (!hasDeceasedInfo) {
        throw new BadRequestException(
          'When life_status is DECEASED, at least one of: deceased_date, deceased_year_approximate, deceased_date_text, or deceased_assumed must be provided',
        );
      }
    }
  }

  private async maybeSendInvitationSms(
    personId: string,
    targetPhone: string,
    inviterAccountId: string,
  ): Promise<void> {
    const inviter = await this.prisma.account.findUnique({
      where: { id: inviterAccountId },
      select: {
        id: true,
        phoneNumber: true,
        languagePreference: true,
        personsClaimed: {
          where: { deletedAt: null },
          select: { displayName: true },
          take: 1,
        },
      },
    });

    if (!inviter) {
      this.logger.warn(`Inviter account ${inviterAccountId} not found`);
      return;
    }

    if (inviter.phoneNumber === targetPhone) {
      this.logger.debug('Skipping auto-SMS — target phone equals inviter phone');
      return;
    }

    const existing = await this.prisma.invitationToken.findFirst({
      where: {
        targetPersonId: personId,
        targetPhoneNumber: targetPhone,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    let token: string;
    if (existing) {
      token = existing.token;
    } else {
      token = randomBytes(48).toString('base64url').substring(0, 64);
      await this.prisma.invitationToken.create({
        data: {
          token,
          inviterAccountId,
          targetPersonId: personId,
          targetPhoneNumber: targetPhone,
        },
      });
    }

    const baseUrl = this.configService.get<string>('webAppUrl', 'http://localhost:3001');
    const inviteUrl = `${baseUrl.replace(/\/$/, '')}/join?invite=${token}`;

    const inviterDisplay =
      inviter.personsClaimed[0]?.displayName ??
      `${inviter.phoneNumber.substring(0, 7)}****`;

    const language = inviter.languagePreference === 'en' ? 'en' : 'fr';

    await this.messaging.sendInvitation({
      toPhoneNumber: targetPhone,
      inviterDisplay,
      inviteUrl,
      language,
    });
  }

  private async normalizeName(name: string): Promise<string> {
    try {
      const result = await this.prisma.$queryRaw<Array<{ normalized: string }>>`
        SELECT normalize_name(${name}) as normalized
      `;
      return result[0]?.normalized ?? name.toLowerCase().trim();
    } catch {
      return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }
  }
}
