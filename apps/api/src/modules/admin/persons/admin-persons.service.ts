import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminActionSeverity,
  LifeStatus,
  Prisma,
  ParentRelationshipType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminAuditService } from '../admin-audit.service';
import type { AdminActor } from '../../../common/decorators/admin-actor.decorator';
import { ListPersonsDto } from './dto/list-persons.dto';
import { AdminUpdatePersonDto } from './dto/admin-update-person.dto';
import { DeletePersonDto } from './dto/delete-person.dto';
import { ForceMergeDto } from './dto/force-merge.dto';

/**
 * Snapshot returned by the list endpoint. Kept narrow on purpose so the
 * dashboard table doesn't have to round-trip large biographies / Json blobs.
 */
const personListSelect = {
  id: true,
  displayName: true,
  gender: true,
  lifeStatus: true,
  birthDate: true,
  birthYearApproximate: true,
  birthPlace: true,
  birthRegion: true,
  birthCountry: true,
  villageOrigin: true,
  hasPhoto: true,
  primaryPhotoId: true,
  verificationLevel: true,
  isPublic: true,
  privacyLevel: true,
  claimedByAccountId: true,
  createdByAccountId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.PersonSelect;

/**
 * Subset of Person fields that PATCH can mutate. Used to capture
 * before/after snapshots for the audit trail without dragging the whole
 * (potentially large) biography blob into every log entry by accident —
 * the caller can still pass them, but at least the surface is explicit.
 */
const editableFields = [
  'displayName',
  'gender',
  'lifeStatus',
  'birthDate',
  'birthYearApproximate',
  'birthPlace',
  'birthRegion',
  'birthCountry',
  'deceasedDate',
  'deceasedYearApproximate',
  'ethnicity',
  'villageOrigin',
  'chefferie',
  'biography',
  'occupation',
  'phoneNumber',
  'isPublic',
  'privacyLevel',
  'verificationLevel',
] as const;

@Injectable()
export class AdminPersonsService {
  private readonly logger = new Logger(AdminPersonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // LIST
  // ---------------------------------------------------------------------------

  async list(query: ListPersonsDto): Promise<{
    items: Array<Prisma.PersonGetPayload<{ select: typeof personListSelect }> & {
      claimCount: number;
      primaryPhotoMediaId: string | null;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.PersonWhereInput = {};

    if (!query.includeDeleted) {
      where.deletedAt = null;
    }

    if (query.lifeStatus) {
      const tokens = query.lifeStatus
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const statuses: LifeStatus[] = [];
      for (const t of tokens) {
        if ((Object.values(LifeStatus) as string[]).includes(t)) {
          statuses.push(t as LifeStatus);
        }
      }
      if (statuses.length > 0) {
        where.lifeStatus = { in: statuses };
      }
    }

    if (query.hasPhoto !== undefined) {
      where.hasPhoto = query.hasPhoto;
    }

    if (query.hasClaim !== undefined) {
      where.claimedByAccountId = query.hasClaim ? { not: null } : null;
    }

    if (query.villageOrigin) {
      where.villageOrigin = {
        contains: query.villageOrigin,
        mode: 'insensitive',
      };
    }
    if (query.region) {
      where.birthRegion = { contains: query.region, mode: 'insensitive' };
    }
    if (query.country) {
      where.birthCountry = { contains: query.country, mode: 'insensitive' };
    }

    if (query.search) {
      const term = query.search.trim();
      // Match against the canonical displayName OR any historical name —
      // critical for finding a person previously known under a different
      // name (married/civil/traditional).
      where.OR = [
        { displayName: { contains: term, mode: 'insensitive' } },
        {
          names: {
            some: {
              fullName: { contains: term, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.person.findMany({
        where,
        select: {
          ...personListSelect,
          _count: { select: { claims: true } },
          photos: {
            where: { deletedAt: null },
            select: { id: true },
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.person.count({ where }),
    ]);

    const items = rows.map((r) => {
      const { _count, photos, primaryPhotoId, ...rest } = r;
      return {
        ...rest,
        primaryPhotoId,
        claimCount: _count.claims,
        // Prefer the explicit primary photo pointer; fall back to the
        // earliest media row when none is marked primary yet.
        primaryPhotoMediaId: primaryPhotoId ?? photos[0]?.id ?? null,
      };
    });

    return { items, total, page, limit };
  }

  // ---------------------------------------------------------------------------
  // DETAIL
  // ---------------------------------------------------------------------------

  async findOne(id: string) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: {
        names: true,
        identityDocuments: {
          where: { deletedAt: null },
          select: {
            id: true,
            documentType: true,
            documentNumberLast4: true,
            issuingAuthority: true,
            issuingPlace: true,
            issueDate: true,
            expiryDate: true,
            verificationStatus: true,
            verifiedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        claims: {
          select: {
            id: true,
            status: true,
            verificationLevel: true,
            validationCount: true,
            evidence: true,
            createdAt: true,
            resolvedAt: true,
            account: {
              select: {
                id: true,
                phoneNumber: true,
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        childrenOf: {
          where: { deletedAt: null },
          select: {
            id: true,
            relationshipType: true,
            confidence: true,
            parent: {
              select: {
                id: true,
                displayName: true,
                gender: true,
                lifeStatus: true,
                birthYearApproximate: true,
              },
            },
          },
        },
        parentsOf: {
          where: { deletedAt: null },
          select: {
            id: true,
            relationshipType: true,
            confidence: true,
            child: {
              select: {
                id: true,
                displayName: true,
                gender: true,
                lifeStatus: true,
                birthYearApproximate: true,
              },
            },
          },
        },
        unionPartners: {
          select: {
            id: true,
            role: true,
            wifeRank: true,
            union: {
              select: {
                id: true,
                unionType: true,
                status: true,
                startYearApproximate: true,
                endYearApproximate: true,
                place: true,
                partners: {
                  select: {
                    personId: true,
                    role: true,
                    person: {
                      select: {
                        id: true,
                        displayName: true,
                        gender: true,
                        lifeStatus: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    const [contributions, auditLog] = await Promise.all([
      this.prisma.contribution.findMany({
        where: { entityType: 'person', entityId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.adminAuditLog.findMany({
        where: { targetEntityType: 'person', targetEntityId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          category: true,
          severity: true,
          reason: true,
          actorAccountId: true,
          actorRole: true,
          beforeState: true,
          afterState: true,
          createdAt: true,
        },
      }),
    ]);

    // Reshape children/parents into the common "parents"/"children" naming
    // that the dashboard expects. childrenOf contains rows where this
    // person is the CHILD (so its `parent` field points to a parent),
    // and parentsOf contains rows where this person is the PARENT.
    const parents = person.childrenOf.map((row) => ({
      relationshipId: row.id,
      relationshipType: row.relationshipType,
      confidence: row.confidence,
      person: row.parent,
    }));
    const children = person.parentsOf.map((row) => ({
      relationshipId: row.id,
      relationshipType: row.relationshipType,
      confidence: row.confidence,
      person: row.child,
    }));
    const unions = person.unionPartners.map((up) => ({
      partnerRowId: up.id,
      role: up.role,
      wifeRank: up.wifeRank,
      union: up.union,
    }));

    const { childrenOf, parentsOf, unionPartners, ...personRest } = person;
    return {
      person: personRest,
      parents,
      children,
      unions,
      contributions,
      auditLog,
    };
  }

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------

  async update(id: string, dto: AdminUpdatePersonDto, actor: AdminActor) {
    const before = await this.prisma.person.findUnique({ where: { id } });
    if (!before) {
      throw new NotFoundException('Person not found');
    }

    const data: Prisma.PersonUpdateInput = {};
    if (dto.displayName !== undefined) data.displayName = dto.displayName;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.lifeStatus !== undefined) data.lifeStatus = dto.lifeStatus;
    if (dto.birthDate !== undefined) {
      data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    }
    if (dto.birthYearApproximate !== undefined) {
      data.birthYearApproximate = dto.birthYearApproximate;
    }
    if (dto.birthPlace !== undefined) data.birthPlace = dto.birthPlace;
    if (dto.birthRegion !== undefined) data.birthRegion = dto.birthRegion;
    if (dto.birthCountry !== undefined) data.birthCountry = dto.birthCountry;
    if (dto.deceasedDate !== undefined) {
      data.deceasedDate = dto.deceasedDate ? new Date(dto.deceasedDate) : null;
    }
    if (dto.deceasedYearApproximate !== undefined) {
      data.deceasedYearApproximate = dto.deceasedYearApproximate;
    }
    if (dto.ethnicity !== undefined) data.ethnicity = dto.ethnicity;
    if (dto.villageOrigin !== undefined) data.villageOrigin = dto.villageOrigin;
    if (dto.chefferie !== undefined) data.chefferie = dto.chefferie;
    if (dto.biography !== undefined) data.biography = dto.biography;
    if (dto.occupation !== undefined) data.occupation = dto.occupation;
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
    if (dto.isPublic !== undefined) data.isPublic = dto.isPublic;
    if (dto.privacyLevel !== undefined) data.privacyLevel = dto.privacyLevel;
    if (dto.verificationLevel !== undefined) {
      data.verificationLevel = dto.verificationLevel;
    }
    data.updatedByAccount = { connect: { id: actor.accountId } };

    const after = await this.prisma.person.update({ where: { id }, data });

    await this.auditService.record({
      actor,
      action: 'persons.update',
      category: 'persons.update',
      severity: AdminActionSeverity.NOTICE,
      targetEntityType: 'person',
      targetEntityId: id,
      reason: dto.reason,
      beforeState: this.snapshot(before),
      afterState: this.snapshot(after),
    });

    return after;
  }

  // ---------------------------------------------------------------------------
  // SOFT DELETE / RESTORE
  // ---------------------------------------------------------------------------

  async softDelete(id: string, dto: DeletePersonDto, actor: AdminActor) {
    const person = await this.prisma.person.findUnique({ where: { id } });
    if (!person) {
      throw new NotFoundException('Person not found');
    }
    if (person.deletedAt) {
      throw new BadRequestException('Person is already deleted');
    }

    const updated = await this.prisma.person.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      actor,
      action: 'persons.delete',
      category: 'persons.delete',
      severity: AdminActionSeverity.WARNING,
      targetEntityType: 'person',
      targetEntityId: id,
      reason: dto.reason,
      beforeState: this.snapshot(person),
      afterState: this.snapshot(updated),
    });

    return { message: 'Person soft-deleted', id };
  }

  async restore(id: string, actor: AdminActor) {
    const person = await this.prisma.person.findUnique({ where: { id } });
    if (!person) {
      throw new NotFoundException('Person not found');
    }
    if (!person.deletedAt) {
      throw new BadRequestException('Person is not deleted');
    }

    const updated = await this.prisma.person.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditService.record({
      actor,
      action: 'persons.restore',
      category: 'persons.restore',
      severity: AdminActionSeverity.NOTICE,
      targetEntityType: 'person',
      targetEntityId: id,
      beforeState: this.snapshot(person),
      afterState: this.snapshot(updated),
    });

    return { message: 'Person restored', id };
  }

  // ---------------------------------------------------------------------------
  // ORPHANS
  //
  // A person is "orphan" when none of:
  //   - they are anyone's parent (parent_child.parentId)
  //   - they are anyone's child (parent_child.childId)
  //   - they belong to any union (union_partners.personId)
  //   - they are claimed by an account
  // We use a raw query because the equivalent Prisma `none`/`every` filter
  // forces multiple correlated subqueries that the planner mis-estimates on
  // tables of this size.
  // ---------------------------------------------------------------------------

  async listOrphans(page = 1, limit = 20): Promise<{
    items: Array<{
      id: string;
      displayName: string;
      gender: string | null;
      lifeStatus: LifeStatus;
      birthYearApproximate: number | null;
      villageOrigin: string | null;
      hasPhoto: boolean;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [rows, totalRows] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          id: string;
          display_name: string;
          gender: string | null;
          life_status: LifeStatus;
          birth_year_approximate: number | null;
          village_origin: string | null;
          has_photo: boolean;
          created_at: Date;
        }>
      >`
        SELECT p.id,
               p.display_name,
               p.gender,
               p.life_status,
               p.birth_year_approximate,
               p.village_origin,
               p.has_photo,
               p.created_at
        FROM persons p
        WHERE p.deleted_at IS NULL
          AND p.claimed_by_account_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM parent_child pc
             WHERE pc.parent_id = p.id AND pc.deleted_at IS NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM parent_child pc
             WHERE pc.child_id = p.id AND pc.deleted_at IS NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM union_partners up WHERE up.person_id = p.id
          )
        ORDER BY p.created_at DESC
        LIMIT ${safeLimit} OFFSET ${skip}
      `,
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM persons p
        WHERE p.deleted_at IS NULL
          AND p.claimed_by_account_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM parent_child pc
             WHERE pc.parent_id = p.id AND pc.deleted_at IS NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM parent_child pc
             WHERE pc.child_id = p.id AND pc.deleted_at IS NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM union_partners up WHERE up.person_id = p.id
          )
      `,
    ]);

    const total = Number(totalRows[0]?.count ?? 0);

    const items = rows.map((r) => ({
      id: r.id,
      displayName: r.display_name,
      gender: r.gender,
      lifeStatus: r.life_status,
      birthYearApproximate: r.birth_year_approximate,
      villageOrigin: r.village_origin,
      hasPhoto: r.has_photo,
      createdAt: r.created_at,
    }));

    return { items, total, page: safePage, limit: safeLimit };
  }

  // ---------------------------------------------------------------------------
  // DUPLICATES
  //
  // Group active persons by (normalizedName, birthYearApproximate) and
  // surface buckets with cardinality > 1. Capped at 50 groups so the UI
  // can render the report in a single page.
  // ---------------------------------------------------------------------------

  async listDuplicates(): Promise<{
    groups: Array<{
      key: { normalizedName: string; year: number | null };
      count: number;
      persons: Array<{
        id: string;
        displayName: string;
        gender: string | null;
        lifeStatus: LifeStatus;
        birthYearApproximate: number | null;
        villageOrigin: string | null;
        createdAt: Date;
      }>;
    }>;
  }> {
    const groupRows = await this.prisma.$queryRaw<
      Array<{
        normalized_name: string;
        birth_year_approximate: number | null;
        cnt: bigint;
      }>
    >`
      SELECT p.normalized_name,
             p.birth_year_approximate,
             COUNT(*)::bigint AS cnt
      FROM persons p
      WHERE p.deleted_at IS NULL
      GROUP BY p.normalized_name, p.birth_year_approximate
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC, p.normalized_name ASC
      LIMIT 50
    `;

    if (groupRows.length === 0) {
      return { groups: [] };
    }

    // Pull every person row that falls into one of the surfaced buckets in a
    // single query — far cheaper than firing 50 round-trips for each group.
    const personsAll = await this.prisma.person.findMany({
      where: {
        deletedAt: null,
        OR: groupRows.map((g) => ({
          normalizedName: g.normalized_name,
          birthYearApproximate: g.birth_year_approximate,
        })),
      },
      select: {
        id: true,
        displayName: true,
        normalizedName: true,
        gender: true,
        lifeStatus: true,
        birthYearApproximate: true,
        villageOrigin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const groups = groupRows.map((g) => {
      const persons = personsAll
        .filter(
          (p) =>
            p.normalizedName === g.normalized_name &&
            p.birthYearApproximate === g.birth_year_approximate,
        )
        .map((p) => ({
          id: p.id,
          displayName: p.displayName,
          gender: p.gender,
          lifeStatus: p.lifeStatus,
          birthYearApproximate: p.birthYearApproximate,
          villageOrigin: p.villageOrigin,
          createdAt: p.createdAt,
        }));
      return {
        key: {
          normalizedName: g.normalized_name,
          year: g.birth_year_approximate,
        },
        count: Number(g.cnt),
        persons,
      };
    });

    return { groups };
  }

  // ---------------------------------------------------------------------------
  // FORCE MERGE
  //
  // Bypasses the MergeProposal queue (SUPER_ADMIN only). The keeper absorbs
  // the loser's relations and the loser is soft-deleted. Everything runs
  // inside a single transaction so a partial reassignment cannot leak.
  // ---------------------------------------------------------------------------

  async forceMerge(dto: ForceMergeDto, actor: AdminActor) {
    if (dto.keeperPersonId === dto.loserPersonId) {
      throw new BadRequestException('Keeper and loser cannot be the same person');
    }

    const [keeper, loser] = await Promise.all([
      this.prisma.person.findUnique({ where: { id: dto.keeperPersonId } }),
      this.prisma.person.findUnique({ where: { id: dto.loserPersonId } }),
    ]);
    if (!keeper) throw new NotFoundException('Keeper person not found');
    if (!loser) throw new NotFoundException('Loser person not found');
    if (keeper.deletedAt) {
      throw new BadRequestException('Keeper person is soft-deleted');
    }
    if (loser.deletedAt) {
      throw new BadRequestException('Loser person is already soft-deleted');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Reassign PersonName rows to the keeper.
      await tx.personName.updateMany({
        where: { personId: loser.id },
        data: { personId: keeper.id },
      });

      // 2. Reassign IdentityDocument rows.
      await tx.identityDocument.updateMany({
        where: { personId: loser.id },
        data: { personId: keeper.id },
      });

      // 3. Reassign photos.
      await tx.media.updateMany({
        where: { personId: loser.id },
        data: { personId: keeper.id },
      });

      // 4. Reassign Source rows.
      await tx.source.updateMany({
        where: { personId: loser.id },
        data: { personId: keeper.id },
      });

      // 5. Move ParentChild edges. The (parentId, childId, relationshipType)
      // unique constraint means we have to drop colliding rows on the loser
      // before the rename — otherwise the UPDATE would explode at the DB
      // boundary. We treat the keeper's existing edge as authoritative.
      await this.mergeParentChildEdges(tx, keeper.id, loser.id);

      // 6. Move union memberships. (unionId, personId) is unique, so a union
      // already containing both keeper and loser would collide — remove the
      // duplicate loser row in that case.
      await this.mergeUnionMemberships(tx, keeper.id, loser.id);

      // 7. Reassign claims. (accountId, personId) is unique on Claim, so
      // where the same account claimed both we keep the keeper's claim and
      // drop the loser's.
      await this.mergeClaims(tx, keeper.id, loser.id);

      // 8. Move historical contributions and pending merge proposals so the
      // audit trail follows the keeper.
      await tx.contribution.updateMany({
        where: { entityType: 'person', entityId: loser.id },
        data: { entityId: keeper.id },
      });
      await tx.mergeProposal.updateMany({
        where: { personAId: loser.id },
        data: { personAId: keeper.id },
      });
      await tx.mergeProposal.updateMany({
        where: { personBId: loser.id },
        data: { personBId: keeper.id },
      });

      // 9. Soft-delete the loser.
      const deletedLoser = await tx.person.update({
        where: { id: loser.id },
        data: { deletedAt: new Date() },
      });

      // 10. Bump the keeper's updatedBy/updatedAt so dashboards refresh.
      const updatedKeeper = await tx.person.update({
        where: { id: keeper.id },
        data: { updatedByAccount: { connect: { id: actor.accountId } } },
      });

      return { keeper: updatedKeeper, loser: deletedLoser };
    });

    await this.auditService.record({
      actor,
      action: 'persons.force-merge',
      category: 'persons.force-merge',
      severity: AdminActionSeverity.CRITICAL,
      targetEntityType: 'person',
      targetEntityId: keeper.id,
      reason: dto.reason,
      beforeState: {
        keeper: this.snapshot(keeper),
        loser: this.snapshot(loser),
      },
      afterState: {
        keeper: this.snapshot(result.keeper),
        loser: this.snapshot(result.loser),
      },
      metadata: {
        keeperPersonId: keeper.id,
        loserPersonId: loser.id,
      },
    });

    return {
      message: 'Force-merge complete',
      keeperPersonId: keeper.id,
      loserPersonId: loser.id,
    };
  }

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  private async mergeParentChildEdges(
    tx: Prisma.TransactionClient,
    keeperId: string,
    loserId: string,
  ): Promise<void> {
    const types = Object.values(ParentRelationshipType);

    // Edges where loser is the parent. Drop loser-side rows that would
    // collide with an already-existing keeper-side row on the same child.
    const loserAsParent = await tx.parentChild.findMany({
      where: { parentId: loserId },
      select: { id: true, childId: true, relationshipType: true },
    });
    for (const edge of loserAsParent) {
      if (edge.childId === keeperId) {
        // Self-loops are nonsensical: drop the row entirely.
        await tx.parentChild.delete({ where: { id: edge.id } });
        continue;
      }
      const conflict = await tx.parentChild.findFirst({
        where: {
          parentId: keeperId,
          childId: edge.childId,
          relationshipType: edge.relationshipType,
        },
        select: { id: true },
      });
      if (conflict) {
        await tx.parentChild.delete({ where: { id: edge.id } });
      } else {
        await tx.parentChild.update({
          where: { id: edge.id },
          data: { parentId: keeperId },
        });
      }
    }

    // Edges where loser is the child. Same collision-handling logic.
    const loserAsChild = await tx.parentChild.findMany({
      where: { childId: loserId },
      select: { id: true, parentId: true, relationshipType: true },
    });
    for (const edge of loserAsChild) {
      if (edge.parentId === keeperId) {
        await tx.parentChild.delete({ where: { id: edge.id } });
        continue;
      }
      const conflict = await tx.parentChild.findFirst({
        where: {
          parentId: edge.parentId,
          childId: keeperId,
          relationshipType: edge.relationshipType,
        },
        select: { id: true },
      });
      if (conflict) {
        await tx.parentChild.delete({ where: { id: edge.id } });
      } else {
        await tx.parentChild.update({
          where: { id: edge.id },
          data: { childId: keeperId },
        });
      }
    }
    // `types` is unused but kept to make the intent obvious to future
    // readers — collisions are scoped per relationship type, which is why
    // we filter by it above.
    void types;
  }

  private async mergeUnionMemberships(
    tx: Prisma.TransactionClient,
    keeperId: string,
    loserId: string,
  ): Promise<void> {
    const memberships = await tx.unionPartner.findMany({
      where: { personId: loserId },
      select: { id: true, unionId: true },
    });
    for (const m of memberships) {
      const conflict = await tx.unionPartner.findUnique({
        where: { unionId_personId: { unionId: m.unionId, personId: keeperId } },
        select: { id: true },
      });
      if (conflict) {
        // Both keeper and loser already partnered the same union — drop
        // the loser row so the keeper's seat is preserved.
        await tx.unionPartner.delete({ where: { id: m.id } });
      } else {
        await tx.unionPartner.update({
          where: { id: m.id },
          data: { personId: keeperId },
        });
      }
    }
  }

  private async mergeClaims(
    tx: Prisma.TransactionClient,
    keeperId: string,
    loserId: string,
  ): Promise<void> {
    const claims = await tx.claim.findMany({
      where: { personId: loserId },
      select: { id: true, accountId: true },
    });
    for (const c of claims) {
      const conflict = await tx.claim.findUnique({
        where: {
          accountId_personId: { accountId: c.accountId, personId: keeperId },
        },
        select: { id: true },
      });
      if (conflict) {
        await tx.claim.delete({ where: { id: c.id } });
      } else {
        await tx.claim.update({
          where: { id: c.id },
          data: { personId: keeperId },
        });
      }
    }
  }

  /**
   * Snapshot a Person row down to the editable surface. Anything not in
   * `editableFields` is dropped on purpose so audit entries stay compact.
   */
  private snapshot(
    person: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const out: Record<string, unknown> = {
      id: person.id,
      deletedAt: this.serialize(person.deletedAt),
    };
    for (const field of editableFields) {
      out[field] = this.serialize(person[field]);
    }
    return out as Prisma.InputJsonValue;
  }

  /**
   * Coerce values into JSON-safe primitives. Dates -> ISO strings,
   * Prisma Decimal -> string, undefined -> null. Everything else is
   * passed through.
   */
  private serialize(value: unknown): unknown {
    if (value === undefined || value === null) return null;
    if (value instanceof Date) return value.toISOString();
    if (
      typeof value === 'object' &&
      value !== null &&
      'toString' in value &&
      value.constructor?.name === 'Decimal'
    ) {
      return (value as { toString(): string }).toString();
    }
    return value;
  }
}
