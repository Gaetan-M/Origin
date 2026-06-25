import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  Prisma,
  LifeStatus,
  LifeEventKind,
  ParentRelationshipType,
  UnionType,
  UnionStatus,
  DatePrecision,
  VisibilityScope,
  type LifeEvent,
  type Person,
  type Union,
} from '@prisma/client';
import type {
  LifeEventRecordedEvent,
  LifeEventKind as DomainLifeEventKind,
} from '@origin/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { EVENT_PUBLISHER, type EventPublisher } from './event-publisher.interface';
import { RecordBirthDto } from './dto/record-birth.dto';
import { RecordDeathDto } from './dto/record-death.dto';
import { RecordUnionDto } from './dto/record-union.dto';

const LIFE_EVENT_RECORDED_VERSION = 1;

export interface BirthResult {
  person: Person;
  lifeEvent: LifeEvent;
}

export interface DeathResult {
  person: Person;
  lifeEvent: LifeEvent;
}

export interface UnionResult {
  union: Union;
  lifeEvent: LifeEvent;
}

/**
 * Life-events engine (S-015/S-016/S-017).
 *
 * Records birth / death / union facts as immutable, dated, visibility-scoped
 * {@link LifeEvent} rows while mutating the underlying graph (Person, ParentChild,
 * Union, UnionPartner). Every mutation is wrapped in a single transaction,
 * writes a Contribution audit row, uses soft-delete semantics, defaults
 * visibility to FAMILY, and publishes a `life-event.recorded` domain event.
 */
@Injectable()
export class LifeEventsService {
  private readonly logger = new Logger(LifeEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * S-015 — Record a birth. Creates an ALIVE Person, ParentChild edges to the
   * supplied parents (NEVER father_id/mother_id), and a BIRTH life event.
   */
  async recordBirth(dto: RecordBirthDto, accountId: string): Promise<BirthResult> {
    const parentIds = this.dedupe(dto.parentPersonIds ?? []);
    await this.assertPersonsExist(parentIds);

    const occurredAt = this.parseDate(dto.birthDate);
    const occurredAtPrecision = dto.birthDatePrecision ?? DatePrecision.UNKNOWN;
    const visibilityScope = dto.visibilityScope ?? VisibilityScope.FAMILY;
    const relationshipType = dto.relationshipType ?? ParentRelationshipType.BIOLOGICAL;

    const result = await this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          displayName: dto.displayName,
          normalizedName: this.normalizeName(dto.displayName),
          gender: dto.gender,
          lifeStatus: LifeStatus.ALIVE,
          birthDate: occurredAt,
          birthDatePrecision: occurredAtPrecision,
          birthPlace: dto.birthPlace,
          birthRegion: dto.birthRegion,
          birthCountry: dto.birthCountry ?? 'Cameroun',
          createdByAccountId: accountId,
          updatedByAccountId: accountId,
        },
      });

      for (const parentId of parentIds) {
        await tx.parentChild.create({
          data: {
            parentId,
            childId: person.id,
            relationshipType,
            createdByAccountId: accountId,
          },
        });
      }

      const lifeEvent = await tx.lifeEvent.create({
        data: {
          kind: LifeEventKind.BIRTH,
          primaryPersonId: person.id,
          occurredAt,
          occurredAtPrecision,
          createdByAccountId: accountId,
          visibilityScope,
          visibleMaxDegree: dto.visibleMaxDegree ?? null,
          participants: {
            create: [
              { personId: person.id, role: 'subject' },
              ...parentIds.map((personId) => ({ personId, role: 'parent' })),
            ],
          },
        },
      });

      await this.writeContribution(tx, accountId, 'person', person.id, 'CREATE', {
        newValue: { displayName: dto.displayName, lifeStatus: LifeStatus.ALIVE },
      });
      await this.writeContribution(tx, accountId, 'life_event', lifeEvent.id, 'CREATE', {
        newValue: { kind: LifeEventKind.BIRTH, primaryPersonId: person.id, parentIds },
      });

      return { person, lifeEvent };
    });

    await this.publishLifeEventRecorded(
      result.lifeEvent.id,
      'birth',
      [result.person.id, ...parentIds],
      accountId,
    );

    return result;
  }

  /**
   * S-016 — Record a death. Flips an existing Person to DECEASED with a date.
   * All existing edges are preserved; a DEATH life event is recorded.
   */
  async recordDeath(dto: RecordDeathDto, accountId: string): Promise<DeathResult> {
    const existing = await this.prisma.person.findFirst({
      where: { id: dto.personId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Person not found / Personne introuvable');
    }

    const occurredAt = this.parseDate(dto.deceasedDate);
    const occurredAtPrecision = dto.deceasedDatePrecision ?? DatePrecision.UNKNOWN;
    const visibilityScope = dto.visibilityScope ?? VisibilityScope.FAMILY;

    const result = await this.prisma.$transaction(async (tx) => {
      const person = await tx.person.update({
        where: { id: existing.id },
        data: {
          lifeStatus: LifeStatus.DECEASED,
          deceasedDate: occurredAt,
          deceasedDatePrecision: occurredAtPrecision,
          deceasedPlace: dto.deceasedPlace,
          deceasedRegion: dto.deceasedRegion,
          deceasedCountry: dto.deceasedCountry,
          updatedByAccountId: accountId,
        },
      });

      const lifeEvent = await tx.lifeEvent.create({
        data: {
          kind: LifeEventKind.DEATH,
          primaryPersonId: person.id,
          occurredAt,
          occurredAtPrecision,
          createdByAccountId: accountId,
          visibilityScope,
          visibleMaxDegree: dto.visibleMaxDegree ?? null,
          participants: {
            create: [{ personId: person.id, role: 'subject' }],
          },
        },
      });

      await this.writeContribution(tx, accountId, 'person', person.id, 'UPDATE', {
        fieldName: 'life_status',
        oldValue: { lifeStatus: existing.lifeStatus },
        newValue: { lifeStatus: LifeStatus.DECEASED },
      });
      await this.writeContribution(tx, accountId, 'life_event', lifeEvent.id, 'CREATE', {
        newValue: { kind: LifeEventKind.DEATH, primaryPersonId: person.id },
      });

      return { person, lifeEvent };
    });

    await this.publishLifeEventRecorded(
      result.lifeEvent.id,
      'death',
      [result.person.id],
      accountId,
    );

    return result;
  }

  /**
   * S-017 — Record a union. Creates a Union, one UnionPartner per partner and a
   * UNION life event linking all partners.
   */
  async recordUnion(dto: RecordUnionDto, accountId: string): Promise<UnionResult> {
    const partnerIds = this.dedupe(dto.partners.map((p) => p.personId));
    if (partnerIds.length < 2) {
      throw new BadRequestException(
        'A union needs at least two distinct partners / Une union nécessite au moins deux partenaires distincts',
      );
    }
    await this.assertPersonsExist(partnerIds);

    const occurredAt = this.parseDate(dto.startDate);
    const occurredAtPrecision = dto.startDatePrecision ?? DatePrecision.UNKNOWN;
    const visibilityScope = dto.visibilityScope ?? VisibilityScope.FAMILY;

    const result = await this.prisma.$transaction(async (tx) => {
      const union = await tx.union.create({
        data: {
          unionType: dto.unionType ?? UnionType.UNKNOWN,
          status: dto.status ?? UnionStatus.UNKNOWN,
          startDate: occurredAt,
          startDatePrecision: occurredAtPrecision,
          place: dto.place,
          createdByAccountId: accountId,
        },
      });

      for (const partner of dto.partners) {
        await tx.unionPartner.create({
          data: {
            unionId: union.id,
            personId: partner.personId,
            role: partner.role,
            wifeRank: partner.wifeRank,
          },
        });
      }

      const lifeEvent = await tx.lifeEvent.create({
        data: {
          kind: LifeEventKind.UNION,
          primaryPersonId: dto.partners[0].personId,
          unionId: union.id,
          occurredAt,
          occurredAtPrecision,
          createdByAccountId: accountId,
          visibilityScope,
          visibleMaxDegree: dto.visibleMaxDegree ?? null,
          participants: {
            create: dto.partners.map((partner) => ({
              personId: partner.personId,
              role: 'partner',
            })),
          },
        },
      });

      await this.writeContribution(tx, accountId, 'union', union.id, 'CREATE', {
        newValue: { unionType: union.unionType, partnerIds },
      });
      await this.writeContribution(tx, accountId, 'life_event', lifeEvent.id, 'CREATE', {
        newValue: { kind: LifeEventKind.UNION, unionId: union.id, partnerIds },
      });

      return { union, lifeEvent };
    });

    await this.publishLifeEventRecorded(
      result.lifeEvent.id,
      'union',
      partnerIds,
      accountId,
    );

    return result;
  }

  // --- internals -----------------------------------------------------------

  private async publishLifeEventRecorded(
    lifeEventId: string,
    kind: DomainLifeEventKind,
    personIds: string[],
    accountId: string,
  ): Promise<void> {
    const event: LifeEventRecordedEvent = {
      type: 'life-event.recorded',
      version: LIFE_EVENT_RECORDED_VERSION,
      occurredAt: new Date().toISOString(),
      actorId: accountId,
      correlationId: randomUUID(),
      payload: { lifeEventId, kind, personIds },
    };

    try {
      await this.eventPublisher.publish(event);
    } catch (err) {
      // The state mutation already committed; a publish failure must not bubble
      // up as a request error. The eventing layer owns retry/outbox semantics.
      this.logger.error(
        `Failed to publish life-event.recorded for ${lifeEventId}: ${(err as Error).message}`,
      );
    }
  }

  private async writeContribution(
    tx: Prisma.TransactionClient,
    accountId: string,
    entityType: string,
    entityId: string,
    action: string,
    payload: {
      fieldName?: string;
      oldValue?: Prisma.InputJsonValue;
      newValue?: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    await tx.contribution.create({
      data: {
        accountId,
        entityType,
        entityId,
        action,
        fieldName: payload.fieldName,
        oldValue: payload.oldValue,
        newValue: payload.newValue,
      },
    });
  }

  private async assertPersonsExist(personIds: string[]): Promise<void> {
    if (personIds.length === 0) {
      return;
    }
    const found = await this.prisma.person.findMany({
      where: { id: { in: personIds }, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== personIds.length) {
      throw new NotFoundException(
        'One or more persons were not found / Une ou plusieurs personnes sont introuvables',
      );
    }
  }

  private dedupe(ids: string[]): string[] {
    return [...new Set(ids)];
  }

  private parseDate(value?: string): Date | null {
    return value ? new Date(value) : null;
  }

  private normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }
}
