import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { DomainEvent } from '@origin/shared-types';
import { VisibilityScope } from '@origin/shared-types';
import { EventPublisher } from '../eventing/event-publisher';
import {
  SEARCH_INDEXER,
  SearchDocument,
  SearchIndexer,
  SearchScopeMeta,
} from './search-indexer.interface';

/** Logical search index that public cultural content is written to. */
export const CULTURAL_INDEX = 'cultural';

/**
 * Moderation lifecycle of a piece of cultural content.
 *
 * Mirrors the `ModerationStatus` Prisma enum (PENDING / APPROVED / REJECTED).
 * Declared as a literal union here so the event contract carries no runtime
 * dependency on the generated Prisma client.
 */
export type ModerationStatusLiteral = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Cultural taxonomy of a piece of content (mirrors `CulturalContentType`). */
export type CulturalContentTypeLiteral =
  | 'LANGUAGE'
  | 'RECIPE'
  | 'TALE'
  | 'PROVERB'
  | 'RITE'
  | 'CUSTOM'
  | 'MUSIC'
  | 'OTHER';

/**
 * Payload of the `cultural-content.published` domain event.
 *
 * Carries only PUBLIC cultural fields plus author/authority display info. It
 * MUST never carry family-graph edges, relationships, degrees, phone numbers,
 * or any private person data — the public world is strictly isolated.
 */
export interface CulturalContentPublishedPayload {
  culturalContentId: string;
  contentType: CulturalContentTypeLiteral;
  title: string;
  /** Plain-text body summary, may be null for media-only content. */
  body: string | null;
  languageCode: string | null;
  region: string | null;
  ethnicGroup: string | null;
  /** Current moderation status; only APPROVED content is indexed. */
  moderationStatus: ModerationStatusLiteral;
  /** Whether the content originates from a verified cultural authority. */
  isFromVerifiedAuthority: boolean;
  /** Public author account id (display attribution only — never private data). */
  authorAccountId: string;
  /** Cultural authority id when authored under a chefferie/expert, else null. */
  authorityId: string | null;
}

/** The `cultural-content.published` domain event envelope. */
export type CulturalContentPublishedEvent = DomainEvent<
  'cultural-content.published',
  CulturalContentPublishedPayload
>;

/**
 * Bridges the cultural-content domain-event stream to the public search index.
 *
 * Listens for {@link CulturalContentPublishedEvent} and, ONLY when the content
 * has been APPROVED by moderation, upserts a searchable document into the
 * 'cultural' index via the {@link SearchIndexer} abstraction. Content that is
 * still PENDING or REJECTED is never indexed, so unmoderated material can never
 * surface in public discovery.
 *
 * Indexed documents are tagged with a PUBLIC {@link SearchScopeMeta} and contain
 * only public cultural fields plus author/authority display info — never
 * family-graph edges or private person data. The public world stays isolated.
 *
 * Backed by the in-memory no-op indexer today, so this wires the public
 * cultural-discovery indexing pipeline end-to-end without Meilisearch online.
 */
@Injectable()
export class CulturalIndexingSubscriber implements OnModuleInit {
  private readonly logger = new Logger(CulturalIndexingSubscriber.name);

  constructor(
    @Inject(SEARCH_INDEXER) private readonly indexer: SearchIndexer,
    private readonly events: EventPublisher,
  ) {}

  /**
   * Wires the public cultural indexing pipeline to the event bus: every
   * published-and-approved cultural content item is upserted into the 'cultural'
   * index. Backed by the in-memory no-op indexer until Meilisearch is
   * provisioned, so this exercises the pipeline end-to-end today.
   */
  onModuleInit(): void {
    this.events.subscribe<CulturalContentPublishedEvent>(
      'cultural-content.published',
      (event) => this.handleCulturalContentPublished(event),
    );
  }

  /**
   * Handle a published cultural-content event by indexing a public, searchable
   * document for it — but only once it has been APPROVED by moderation.
   *
   * Non-APPROVED content (PENDING / REJECTED) is skipped entirely: nothing is
   * written to the index, so unmoderated content can never leak into public
   * discovery. The indexed document carries a PUBLIC scope and only public
   * cultural + author/authority display fields.
   */
  async handleCulturalContentPublished(
    event: CulturalContentPublishedEvent,
  ): Promise<void> {
    const {
      culturalContentId,
      contentType,
      title,
      body,
      languageCode,
      region,
      ethnicGroup,
      moderationStatus,
      isFromVerifiedAuthority,
      authorAccountId,
      authorityId,
    } = event.payload;

    if (moderationStatus !== 'APPROVED') {
      this.logger.debug(
        `skipped cultural-content ${culturalContentId} (status=${moderationStatus}, not APPROVED)`,
      );
      return;
    }

    const doc: SearchDocument = {
      culturalContentId,
      contentType,
      title,
      body,
      languageCode,
      region,
      ethnicGroup,
      isFromVerifiedAuthority,
      authorAccountId,
      authorityId,
      publishedAt: event.occurredAt,
    };

    // Cultural discovery is the PUBLIC world: scope is always PUBLIC, with no
    // family owner anchor and no degree bound. This keeps the public index free
    // of any family-graph access metadata.
    const scopeMeta: SearchScopeMeta = {
      visibilityScope: VisibilityScope.PUBLIC,
      ownerPersonId: null,
      visibleMaxDegree: null,
    };

    await this.indexer.indexDocument(
      CULTURAL_INDEX,
      culturalContentId,
      doc,
      scopeMeta,
    );

    this.logger.debug(
      `indexed cultural-content ${culturalContentId} (type=${contentType}, verified=${isFromVerifiedAuthority})`,
    );
  }
}
