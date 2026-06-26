import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountRole,
  AdminActionSeverity,
  Prisma,
  TourismCategory,
  VisibilityScope,
  type TourismPlace,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../admin/admin-audit.service';
import type { AdminActor } from '../../common/decorators/admin-actor.decorator';
import { SubmitPlaceDto } from './dto/submit-place.dto';

const MODERATOR_ROLES: ReadonlySet<AccountRole> = new Set<AccountRole>([
  AccountRole.MODERATOR,
  AccountRole.ADMIN,
  AccountRole.SUPER_ADMIN,
]);

export interface ListPlacesFilter {
  region?: string;
  category?: TourismCategory;
  verifiedOnly?: boolean;
  take?: number;
  skip?: number;
}

/**
 * Tourism / heritage places for the PUBLIC discovery world.
 *
 * Surfaces highlighted places of heritage and tourism. Official (MINISTRY) and
 * NGO records are ingested STRICTLY as a cited SOURCE: every place carries its
 * `source` + `sourceRef` provenance so the origin is transparent to end users.
 *
 * INDEPENDENCE is a core value — this module never grants any source authority
 * over the family graph, exposes no person/relationship data, and accepts no
 * government write access. Verification is a moderator-driven editorial trust
 * signal, nothing more.
 *
 * Every mutation writes a Contribution audit row, privileged actions also write
 * an AdminAuditLog, and soft-delete semantics apply everywhere.
 */
@Injectable()
export class TourismService {
  private readonly logger = new Logger(TourismService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  /**
   * Submit a new PUBLIC tourism place. Always created UNVERIFIED
   * (verified=false); a moderator verifies it later. The provenance (source +
   * sourceRef) is persisted so the origin is always shown.
   */
  async submitPlace(
    accountId: string,
    dto: SubmitPlaceDto,
  ): Promise<TourismPlace> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.tourismPlace.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          region: dto.region ?? null,
          category: dto.category,
          latitude:
            dto.latitude === undefined
              ? null
              : new Prisma.Decimal(dto.latitude),
          longitude:
            dto.longitude === undefined
              ? null
              : new Prisma.Decimal(dto.longitude),
          source: dto.source,
          sourceRef: dto.sourceRef ?? null,
          verified: false,
          mediaId: dto.mediaId ?? null,
          submittedByAccountId: accountId,
          visibilityScope: VisibilityScope.PUBLIC,
        },
      });

      await this.writeContribution(tx, {
        accountId,
        entityId: created.id,
        action: 'CREATE',
        newValue: {
          name: created.name,
          category: created.category,
          source: created.source,
          sourceRef: created.sourceRef,
          verified: created.verified,
        },
      });

      return created;
    });
  }

  /**
   * PUBLIC list of tourism places, verified-first then newest-first, so trusted
   * provenance bubbles to the top. Soft-deleted and non-PUBLIC rows are never
   * returned. Each row carries its `source` + `sourceRef` provenance.
   */
  async listPlaces(filter: ListPlacesFilter = {}): Promise<TourismPlace[]> {
    const where: Prisma.TourismPlaceWhereInput = {
      deletedAt: null,
      visibilityScope: VisibilityScope.PUBLIC,
    };

    if (filter.region) {
      where.region = filter.region;
    }
    if (filter.category) {
      where.category = filter.category;
    }
    if (filter.verifiedOnly) {
      where.verified = true;
    }

    return this.prisma.tourismPlace.findMany({
      where,
      orderBy: [{ verified: 'desc' }, { createdAt: 'desc' }],
      take: filter.take ?? 50,
      skip: filter.skip ?? 0,
    });
  }

  /**
   * Fetch a single non-deleted PUBLIC place by id, provenance included.
   */
  async getPlace(id: string): Promise<TourismPlace> {
    const place = await this.prisma.tourismPlace.findFirst({
      where: {
        id,
        deletedAt: null,
        visibilityScope: VisibilityScope.PUBLIC,
      },
    });
    if (!place) {
      throw new NotFoundException(
        'Tourism place not found / Lieu touristique introuvable',
      );
    }
    return place;
  }

  /**
   * Grant or revoke the verified badge of a place. Moderator+ only.
   *
   * The controller already gates this with RolesGuard; we re-check here as
   * defence-in-depth so the service is safe to call from non-HTTP handlers.
   * Writes both an AdminAuditLog and a Contribution row.
   */
  async verifyPlace(
    placeId: string,
    actor: AdminActor,
    verified: boolean,
    reason?: string | null,
  ): Promise<TourismPlace> {
    this.assertModerator(actor.role);

    const place = await this.prisma.tourismPlace.findFirst({
      where: { id: placeId, deletedAt: null },
      select: { id: true, verified: true, submittedByAccountId: true },
    });
    if (!place) {
      throw new NotFoundException(
        'Tourism place not found / Lieu touristique introuvable',
      );
    }

    const updated = await this.prisma.tourismPlace.update({
      where: { id: placeId },
      data: {
        verified,
        verifiedByAccountId: verified ? actor.accountId : null,
      },
    });

    await this.audit.record({
      actor,
      action: verified ? 'tourism_place.verify' : 'tourism_place.unverify',
      category: 'moderation',
      severity: AdminActionSeverity.NOTICE,
      targetEntityType: 'tourism_place',
      targetEntityId: placeId,
      targetAccountId: place.submittedByAccountId,
      reason: reason ?? null,
      beforeState: { verified: place.verified },
      afterState: { verified },
    });

    await this.writeContribution(this.prisma, {
      accountId: actor.accountId,
      entityId: placeId,
      action: verified ? 'VERIFY' : 'UNVERIFY',
      fieldName: 'verified',
      oldValue: { verified: place.verified },
      newValue: { verified },
      note: reason ?? undefined,
    });

    return updated;
  }

  // --- internals -----------------------------------------------------------

  private assertModerator(role: AccountRole): void {
    if (!MODERATOR_ROLES.has(role)) {
      throw new ForbiddenException(
        'Moderator privileges required / Privilèges de modérateur requis',
      );
    }
  }

  private async writeContribution(
    client: Prisma.TransactionClient | PrismaService,
    input: {
      accountId: string;
      entityId: string;
      action: string;
      fieldName?: string;
      oldValue?: Prisma.JsonObject;
      newValue?: Prisma.JsonObject;
      note?: string;
    },
  ): Promise<void> {
    try {
      await client.contribution.create({
        data: {
          accountId: input.accountId,
          entityType: 'tourism_place',
          entityId: input.entityId,
          action: input.action,
          fieldName: input.fieldName ?? null,
          oldValue: input.oldValue
            ? (input.oldValue as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          newValue: input.newValue
            ? (input.newValue as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          note: input.note ?? null,
        },
      });
    } catch (err) {
      // Contribution is an audit side-effect; the underlying mutation is
      // already committed. Log and move on rather than failing the request.
      this.logger.error(
        `Failed to write tourism contribution (${input.action}): ${
          (err as Error).message
        }`,
      );
    }
  }
}
