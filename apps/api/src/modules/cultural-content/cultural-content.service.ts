import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  Prisma,
  ModerationStatus,
  VisibilityScope,
  type CulturalAuthority,
  type CulturalContent,
} from '@prisma/client';
import type { DomainEvent } from '@origin/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublisher } from '../../eventing/event-publisher';
import { CreateCulturalContentDto } from './dto/create-cultural-content.dto';
import { RegisterAuthorityDto } from './dto/register-authority.dto';

const CULTURAL_CONTENT_PUBLISHED_VERSION = 1;

/**
 * Inline typed payload for the cultural-content publication event.
 *
 * Public by construction: it carries ONLY the content's own identity and
 * moderation state plus the authoring account — never any family-graph edge,
 * relationship, degree, phone number, or private person data.
 */
export interface CulturalContentPublishedPayload {
  culturalContentId: string;
  contentType: CulturalContent['contentType'];
  title: string;
  body: string | null;
  languageCode: string | null;
  region: string | null;
  ethnicGroup: string | null;
  moderationStatus: ModerationStatus;
  isFromVerifiedAuthority: boolean;
  authorAccountId: string;
  authorityId: string | null;
}

export type CulturalContentPublishedEvent = DomainEvent<
  'cultural-content.published',
  CulturalContentPublishedPayload
>;

/**
 * Cultural content authoring + cultural-authority self-registration.
 *
 * Drives the PUBLIC discovery world: community members and verified
 * experts/chefferies publish heritage content (languages, cuisine, tales,
 * proverbs, rites, customs, music). Content from a VERIFIED authority is
 * auto-approved; everything else enters the moderation queue as PENDING.
 *
 * Every mutation writes a Contribution audit row and uses soft-delete
 * semantics. A `cultural-content.published` domain event is emitted on publish
 * so the search seam can index the (public) document.
 */
@Injectable()
export class CulturalContentService {
  private readonly logger = new Logger(CulturalContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Author a new PUBLIC piece of cultural content.
   *
   * Auto-approves when the author is a VERIFIED CulturalAuthority; otherwise the
   * content is PENDING moderation. Writes an audit Contribution and publishes a
   * `cultural-content.published` event for indexing.
   */
  async createContent(
    dto: CreateCulturalContentDto,
    accountId: string,
  ): Promise<CulturalContent> {
    const verifiedAuthority = await this.prisma.culturalAuthority.findFirst({
      where: { accountId, verified: true, deletedAt: null },
    });

    // If the author pins the content to an explicit authority, that authority
    // must belong to them — content cannot be published under someone else's
    // identity.
    if (dto.authorityId) {
      const owned = await this.prisma.culturalAuthority.findFirst({
        where: { id: dto.authorityId, accountId, deletedAt: null },
        select: { id: true },
      });
      if (!owned) {
        throw new ForbiddenException(
          'You cannot publish under an authority you do not own / Vous ne pouvez pas publier sous une autorité qui ne vous appartient pas',
        );
      }
    }

    const isFromVerifiedAuthority = verifiedAuthority !== null;
    const moderationStatus = isFromVerifiedAuthority
      ? ModerationStatus.APPROVED
      : ModerationStatus.PENDING;

    const content = await this.prisma.$transaction(async (tx) => {
      const created = await tx.culturalContent.create({
        data: {
          authorAccountId: accountId,
          authorityId: dto.authorityId ?? verifiedAuthority?.id ?? null,
          contentType: dto.contentType,
          title: dto.title,
          body: dto.body ?? null,
          languageCode: dto.languageCode ?? null,
          region: dto.region ?? null,
          ethnicGroup: dto.ethnicGroup ?? null,
          mediaId: dto.mediaId ?? null,
          visibilityScope: VisibilityScope.PUBLIC,
          moderationStatus,
          isFromVerifiedAuthority,
        },
      });

      await this.writeContribution(tx, accountId, created.id, 'CREATE', {
        newValue: {
          contentType: created.contentType,
          title: created.title,
          moderationStatus,
          isFromVerifiedAuthority,
        },
      });

      return created;
    });

    await this.publishContentPublished(content, accountId);

    return content;
  }

  /**
   * Self-register the calling account as a cultural authority. Always created
   * UNVERIFIED (verified=false); a moderator verifies it later.
   */
  async registerAsAuthority(
    dto: RegisterAuthorityDto,
    accountId: string,
  ): Promise<CulturalAuthority> {
    const existing = await this.prisma.culturalAuthority.findFirst({
      where: { accountId, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        'This account is already registered as a cultural authority / Ce compte est déjà enregistré comme autorité culturelle',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const authority = await tx.culturalAuthority.create({
        data: {
          accountId,
          kind: dto.kind,
          displayName: dto.displayName,
          region: dto.region ?? null,
          ethnicGroup: dto.ethnicGroup ?? null,
          bio: dto.bio ?? null,
          verified: false,
        },
      });

      await this.writeAuthorityContribution(
        tx,
        accountId,
        authority.id,
        'CREATE',
        {
          newValue: {
            kind: authority.kind,
            displayName: authority.displayName,
            verified: false,
          },
        },
      );

      return authority;
    });
  }

  /**
   * List the calling account's own authored content (newest first), including
   * not-yet-approved items so authors can track their submissions.
   */
  async listMine(accountId: string): Promise<CulturalContent[]> {
    return this.prisma.culturalContent.findMany({
      where: { authorAccountId: accountId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fetch a single non-deleted content item by id.
   */
  async getById(id: string): Promise<CulturalContent> {
    const content = await this.prisma.culturalContent.findFirst({
      where: { id, deletedAt: null },
    });
    if (!content) {
      throw new NotFoundException(
        'Cultural content not found / Contenu culturel introuvable',
      );
    }
    return content;
  }

  // --- internals -----------------------------------------------------------

  private async publishContentPublished(
    content: CulturalContent,
    accountId: string,
  ): Promise<void> {
    const event: CulturalContentPublishedEvent = {
      type: 'cultural-content.published',
      version: CULTURAL_CONTENT_PUBLISHED_VERSION,
      occurredAt: new Date().toISOString(),
      actorId: accountId,
      correlationId: randomUUID(),
      payload: {
        culturalContentId: content.id,
        contentType: content.contentType,
        title: content.title,
        body: content.body,
        languageCode: content.languageCode,
        region: content.region,
        ethnicGroup: content.ethnicGroup,
        moderationStatus: content.moderationStatus,
        isFromVerifiedAuthority: content.isFromVerifiedAuthority,
        authorAccountId: content.authorAccountId,
        authorityId: content.authorityId,
      },
    };

    try {
      await this.eventPublisher.publish(event);
    } catch (err) {
      // The content already committed; a publish failure must not surface as a
      // request error. The eventing layer owns retry/outbox semantics.
      this.logger.error(
        `Failed to publish cultural-content.published for ${content.id}: ${
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
    payload: { newValue: Prisma.InputJsonValue },
  ): Promise<void> {
    await tx.contribution.create({
      data: {
        accountId,
        entityType: 'cultural_content',
        entityId,
        action,
        newValue: payload.newValue,
      },
    });
  }

  private async writeAuthorityContribution(
    tx: Prisma.TransactionClient,
    accountId: string,
    entityId: string,
    action: string,
    payload: { newValue: Prisma.InputJsonValue },
  ): Promise<void> {
    await tx.contribution.create({
      data: {
        accountId,
        entityType: 'cultural_authority',
        entityId,
        action,
        newValue: payload.newValue,
      },
    });
  }
}
