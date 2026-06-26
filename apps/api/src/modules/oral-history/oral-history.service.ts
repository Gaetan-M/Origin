import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, VisibilityScope, type Source } from '@prisma/client';
import type { DomainEvent } from '@origin/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublisher } from '../../eventing/event-publisher';
import { VisibilityGuard } from '../authorization/visibility.guard';
import { TestimonyKind } from './dto/create-testimony.dto';

const TESTIMONY_RECORDED_VERSION = 1;

/**
 * Public-by-construction payload for the testimony-recorded event.
 *
 * Carries ONLY the testimony's own identity and graph anchor — never the
 * transcript body, phone numbers, or any private person data.
 */
export interface TestimonyRecordedPayload {
  sourceId: string;
  personId: string | null;
  unionId: string | null;
  mediaId: string | null;
  hasTranscript: boolean;
  sourceType: string | null;
  authorAccountId: string;
}

export type TestimonyRecordedEvent = DomainEvent<
  'oral-history.testimony-recorded',
  TestimonyRecordedPayload
>;

interface RecordTestimonyInput {
  personId?: string;
  unionId?: string;
  mediaId: string;
  transcript?: string;
  title?: string;
  sourceType?: TestimonyKind;
  visibilityScope?: VisibilityScope;
}

/**
 * Oral history — audio/video testimonies from elders, persisted on the EXISTING
 * Source model (no parallel table).
 *
 * WHY THIS MATTERS / URGENCY: across the African genealogical landscape, the
 * richest records of lineage, migration, naming, rites and proverbs live only
 * in the memory of elders. When an elder passes undocumented, that branch of
 * knowledge is gone for good. This service exists to capture those voices NOW —
 * a recording today, a transcript whenever someone has time. Speed of capture
 * beats completeness.
 *
 * Mapping onto Source columns (reuse, never duplicate):
 *   - dto.personId       -> Source.person_id
 *   - dto.unionId        -> Source.union_id
 *   - dto.mediaId        -> Source.media_file_id   (the audio/video, from media module)
 *   - dto.transcript     -> Source.audio_transcript
 *   - dto.title          -> Source.title
 *   - dto.sourceType     -> Source.source_type
 *   - author             -> Source.added_by_account_id
 *   - dto.visibilityScope-> Source.visibility_scope
 *
 * Every write produces a Contribution audit row; reads are visibility-aware and
 * soft-delete respecting.
 */
@Injectable()
export class OralHistoryService {
  private readonly logger = new Logger(OralHistoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisher,
    private readonly visibilityGuard: VisibilityGuard,
  ) {}

  /**
   * Record a new testimony against a person and/or union.
   *
   * Validates that the referenced graph anchor(s) and media exist (and are not
   * soft-deleted), persists a Source row, writes a Contribution audit entry and
   * emits an `oral-history.testimony-recorded` domain event.
   */
  async recordTestimony(
    authorAccountId: string,
    input: RecordTestimonyInput,
  ): Promise<Source> {
    if (!input.personId && !input.unionId) {
      throw new BadRequestException(
        'A testimony must be attached to a person or a union / Un témoignage doit être rattaché à une personne ou une union',
      );
    }

    // Anchor + media existence checks (soft-delete aware where applicable).
    if (input.personId) {
      const person = await this.prisma.person.findFirst({
        where: { id: input.personId, deletedAt: null },
        select: { id: true },
      });
      if (!person) {
        throw new NotFoundException(
          'Person not found / Personne introuvable',
        );
      }
    }

    if (input.unionId) {
      const union = await this.prisma.union.findFirst({
        where: { id: input.unionId, deletedAt: null },
        select: { id: true },
      });
      if (!union) {
        throw new NotFoundException('Union not found / Union introuvable');
      }
    }

    const media = await this.prisma.media.findFirst({
      where: { id: input.mediaId, deletedAt: null },
      select: { id: true },
    });
    if (!media) {
      throw new NotFoundException(
        'Media not found / Média introuvable. Upload the audio/video first.',
      );
    }

    const source = await this.prisma.$transaction(async (tx) => {
      const created = await tx.source.create({
        data: {
          personId: input.personId ?? null,
          unionId: input.unionId ?? null,
          mediaFileId: input.mediaId,
          audioTranscript: input.transcript ?? null,
          title: input.title ?? null,
          sourceType: input.sourceType ?? TestimonyKind.ORAL_TESTIMONY,
          addedByAccountId: authorAccountId,
          visibilityScope:
            input.visibilityScope ?? VisibilityScope.PRIVATE_SELF,
        },
      });

      await this.writeContribution(tx, authorAccountId, created.id, 'CREATE', {
        personId: created.personId,
        unionId: created.unionId,
        sourceType: created.sourceType,
        hasTranscript: created.audioTranscript !== null,
      });

      return created;
    });

    await this.publishTestimonyRecorded(source, authorAccountId);

    return source;
  }

  /**
   * List the testimonies attached to a person, filtered to what the requester
   * is allowed to see under the visibility model.
   *
   * Decision per testimony (delegated to the shared VisibilityGuard.evaluate,
   * with the SUBJECT person as the visibility owner):
   *   - the author of the recording always sees their own testimony;
   *   - PUBLIC   -> any authenticated requester;
   *   - PRIVATE_SELF / FAMILY -> resolved against the requester's claimed person
   *     and family-graph degree to the subject.
   */
  async listForPerson(
    personId: string,
    requesterAccountId: string,
  ): Promise<Source[]> {
    const testimonies = await this.prisma.source.findMany({
      where: { personId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (testimonies.length === 0) {
      return [];
    }

    const requesterPersonId =
      await this.resolveClaimedPersonId(requesterAccountId);

    const visible: Source[] = [];
    for (const testimony of testimonies) {
      // The author can always retrieve a recording they made themselves.
      if (testimony.addedByAccountId === requesterAccountId) {
        visible.push(testimony);
        continue;
      }

      const allowed = await this.visibilityGuard.evaluate(
        {
          visibilityScope: testimony.visibilityScope,
          ownerId: testimony.personId,
          visibleMaxDegree: testimony.visibleMaxDegree,
        },
        requesterPersonId,
      );
      if (allowed) {
        visible.push(testimony);
      }
    }

    return visible;
  }

  // --- internals -----------------------------------------------------------

  /**
   * Resolve the VERIFIED person a requester account is claimed as, if any.
   * Returns null when the account has no verified claim (FAMILY/PRIVATE scopes
   * then fail closed in the guard).
   */
  private async resolveClaimedPersonId(
    accountId: string,
  ): Promise<string | null> {
    const claim = await this.prisma.claim.findFirst({
      where: { accountId, status: 'VERIFIED' },
      select: { personId: true },
    });
    return claim?.personId ?? null;
  }

  private async publishTestimonyRecorded(
    source: Source,
    authorAccountId: string,
  ): Promise<void> {
    const event: TestimonyRecordedEvent = {
      type: 'oral-history.testimony-recorded',
      version: TESTIMONY_RECORDED_VERSION,
      occurredAt: new Date().toISOString(),
      actorId: authorAccountId,
      correlationId: randomUUID(),
      payload: {
        sourceId: source.id,
        personId: source.personId,
        unionId: source.unionId,
        mediaId: source.mediaFileId,
        hasTranscript: source.audioTranscript !== null,
        sourceType: source.sourceType,
        authorAccountId,
      },
    };

    try {
      await this.eventPublisher.publish(event);
    } catch (err) {
      // The testimony already committed; a publish failure must not surface as
      // a request error. The eventing layer owns retry/outbox semantics.
      this.logger.error(
        `Failed to publish oral-history.testimony-recorded for ${source.id}: ${
          (err as Error).message
        }`,
      );
    }
  }

  private async writeContribution(
    tx: Prisma.TransactionClient,
    accountId: string,
    entityId: string,
    action: string,
    newValue: Prisma.InputJsonValue,
  ): Promise<void> {
    await tx.contribution.create({
      data: {
        accountId,
        entityType: 'source',
        entityId,
        action,
        newValue,
      },
    });
  }
}
