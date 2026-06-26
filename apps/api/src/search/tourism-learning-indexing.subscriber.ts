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

/** Logical search index that public, verified tourism places are written to. */
export const TOURISM_INDEX = 'tourism';

/** Logical search index that public, approved learning lessons are written to. */
export const LEARNING_INDEX = 'learning';

/**
 * Provenance of a tourism place (mirrors the `TourismSource` Prisma enum).
 *
 * Declared as a literal union so the event contract carries no runtime
 * dependency on the generated Prisma client. Independence note: official
 * (MINISTRY) and NGO data are used STRICTLY as a cited source — never as
 * authority over the family graph.
 */
export type TourismSourceLiteral = 'MINISTRY' | 'NGO' | 'COMMUNITY';

/** Tourism taxonomy of a place (mirrors the `TourismCategory` Prisma enum). */
export type TourismCategoryLiteral =
  | 'HERITAGE'
  | 'NATURE'
  | 'CULTURE'
  | 'MUSEUM'
  | 'CHEFFERIE'
  | 'RELIGIOUS'
  | 'OTHER';

/** Difficulty level of a learning lesson (mirrors the `LearningLevel` enum). */
export type LearningLevelLiteral = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/**
 * Moderation lifecycle of a learning lesson.
 *
 * Mirrors the `ModerationStatus` Prisma enum (PENDING / APPROVED / REJECTED).
 * Declared as a literal union here so the event contract carries no runtime
 * dependency on the generated Prisma client.
 */
export type ModerationStatusLiteral = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Payload of the `tourism-place.verified` domain event.
 *
 * Carries only PUBLIC tourism fields plus provenance attribution. It MUST never
 * carry family-graph edges, relationships, degrees, phone numbers, or any
 * private person data — tourism is a strictly isolated public vertical and the
 * official/NGO origin is shown only as a cited SOURCE, never as graph authority.
 */
export interface TourismPlaceVerifiedPayload {
  tourismPlaceId: string;
  name: string;
  /** Plain-text description, may be null. */
  description: string | null;
  region: string | null;
  category: TourismCategoryLiteral;
  /** Decimal degrees serialized as strings to preserve Prisma Decimal precision. */
  latitude: string | null;
  longitude: string | null;
  /** Provenance: where the place data originates from. */
  source: TourismSourceLiteral;
  /** Provenance citation/url shown to the user. */
  sourceRef: string | null;
  /** Only verified places are indexed; carried for explicit contract clarity. */
  verified: boolean;
  /** Optional cover media id (display only). */
  mediaId: string | null;
}

/** The `tourism-place.verified` domain event envelope. */
export type TourismPlaceVerifiedEvent = DomainEvent<
  'tourism-place.verified',
  TourismPlaceVerifiedPayload
>;

/**
 * Payload of the `learning-lesson.published` domain event.
 *
 * Carries only PUBLIC learning fields plus author/authority display info. It
 * MUST never carry family-graph edges, relationships, degrees, phone numbers,
 * or any private person data — the public learning world is strictly isolated.
 */
export interface LearningLessonPublishedPayload {
  learningLessonId: string;
  title: string;
  /** Short description, may be null. */
  description: string | null;
  /** Plain-text lesson body summary, may be null for media-only lessons. */
  content: string | null;
  /** The language being taught (e.g. 'bbj'), may be null. */
  languageCode: string | null;
  level: LearningLevelLiteral;
  ethnicGroup: string | null;
  /** Current moderation status; only APPROVED lessons are indexed. */
  moderationStatus: ModerationStatusLiteral;
  /** Whether the lesson is authored under a verified cultural authority. */
  isFromVerifiedAuthority: boolean;
  /** Public author account id (display attribution only — never private data). */
  authorAccountId: string;
  /** Cultural authority id when authored under a chefferie/expert, else null. */
  authorityId: string | null;
  /** Whether the lesson is ticketed/premium (links to a live LESSON or paywall). */
  isTicketed: boolean;
}

/** The `learning-lesson.published` domain event envelope. */
export type LearningLessonPublishedEvent = DomainEvent<
  'learning-lesson.published',
  LearningLessonPublishedPayload
>;

/**
 * Bridges the tourism and learning domain-event streams to the public search
 * index.
 *
 * Listens for {@link TourismPlaceVerifiedEvent} and
 * {@link LearningLessonPublishedEvent} and, ONLY when the entity is publishable
 * (a verified tourism place / an APPROVED lesson), upserts a searchable document
 * into the 'tourism' / 'learning' index via the {@link SearchIndexer}
 * abstraction. Unverified places and PENDING/REJECTED lessons are never indexed,
 * so unmoderated material can never surface in public discovery.
 *
 * Indexed documents are tagged with a PUBLIC {@link SearchScopeMeta} and contain
 * only public fields plus author/authority/provenance display info — never
 * family-graph edges or private person data. The public world stays isolated,
 * and tourism provenance (MINISTRY/NGO/COMMUNITY) is carried as a cited source,
 * never as governance over the family graph.
 *
 * Backed by the in-memory no-op indexer today, so this wires the public
 * tourism + learning discovery pipelines end-to-end without Meilisearch online.
 *
 * If the tourism/learning services do not (yet) publish these events, the
 * subscriber still compiles and simply never fires.
 */
@Injectable()
export class TourismLearningIndexingSubscriber implements OnModuleInit {
  private readonly logger = new Logger(TourismLearningIndexingSubscriber.name);

  constructor(
    @Inject(SEARCH_INDEXER) private readonly indexer: SearchIndexer,
    private readonly events: EventPublisher,
  ) {}

  /**
   * Wires both public indexing pipelines to the event bus:
   * - verified tourism places are upserted into the 'tourism' index,
   * - approved learning lessons are upserted into the 'learning' index.
   *
   * Backed by the in-memory no-op indexer until Meilisearch is provisioned, so
   * this exercises the pipelines end-to-end today.
   */
  onModuleInit(): void {
    this.events.subscribe<TourismPlaceVerifiedEvent>(
      'tourism-place.verified',
      (event) => this.handleTourismPlaceVerified(event),
    );
    this.events.subscribe<LearningLessonPublishedEvent>(
      'learning-lesson.published',
      (event) => this.handleLearningLessonPublished(event),
    );
  }

  /**
   * Handle a verified tourism place by indexing a public, searchable document
   * for it — but only once it has actually been verified.
   *
   * Unverified places are skipped entirely: nothing is written to the index, so
   * unsourced/unverified tourism data can never leak into public discovery. The
   * indexed document carries a PUBLIC scope and only public tourism + provenance
   * display fields. Provenance is shown as a cited source, never as authority.
   */
  async handleTourismPlaceVerified(
    event: TourismPlaceVerifiedEvent,
  ): Promise<void> {
    const {
      tourismPlaceId,
      name,
      description,
      region,
      category,
      latitude,
      longitude,
      source,
      sourceRef,
      verified,
      mediaId,
    } = event.payload;

    if (!verified) {
      this.logger.debug(
        `skipped tourism-place ${tourismPlaceId} (verified=false)`,
      );
      return;
    }

    const doc: SearchDocument = {
      tourismPlaceId,
      name,
      description,
      region,
      category,
      latitude,
      longitude,
      source,
      sourceRef,
      mediaId,
      verifiedAt: event.occurredAt,
    };

    await this.indexer.indexDocument(
      TOURISM_INDEX,
      tourismPlaceId,
      doc,
      this.publicScopeMeta(),
    );

    this.logger.debug(
      `indexed tourism-place ${tourismPlaceId} (category=${category}, source=${source})`,
    );
  }

  /**
   * Handle a published learning lesson by indexing a public, searchable document
   * for it — but only once it has been APPROVED by moderation.
   *
   * Non-APPROVED lessons (PENDING / REJECTED) are skipped entirely: nothing is
   * written to the index, so unmoderated lessons can never leak into public
   * discovery. The indexed document carries a PUBLIC scope and only public
   * learning + author/authority display fields.
   */
  async handleLearningLessonPublished(
    event: LearningLessonPublishedEvent,
  ): Promise<void> {
    const {
      learningLessonId,
      title,
      description,
      content,
      languageCode,
      level,
      ethnicGroup,
      moderationStatus,
      isFromVerifiedAuthority,
      authorAccountId,
      authorityId,
      isTicketed,
    } = event.payload;

    if (moderationStatus !== 'APPROVED') {
      this.logger.debug(
        `skipped learning-lesson ${learningLessonId} (status=${moderationStatus}, not APPROVED)`,
      );
      return;
    }

    const doc: SearchDocument = {
      learningLessonId,
      title,
      description,
      content,
      languageCode,
      level,
      ethnicGroup,
      isFromVerifiedAuthority,
      authorAccountId,
      authorityId,
      isTicketed,
      publishedAt: event.occurredAt,
    };

    await this.indexer.indexDocument(
      LEARNING_INDEX,
      learningLessonId,
      doc,
      this.publicScopeMeta(),
    );

    this.logger.debug(
      `indexed learning-lesson ${learningLessonId} (language=${languageCode ?? 'n/a'}, level=${level})`,
    );
  }

  /**
   * Tourism and learning discovery are the PUBLIC world: scope is always PUBLIC,
   * with no family owner anchor and no degree bound. This keeps the public
   * indexes free of any family-graph access metadata.
   */
  private publicScopeMeta(): SearchScopeMeta {
    return {
      visibilityScope: VisibilityScope.PUBLIC,
      ownerPersonId: null,
      visibleMaxDegree: null,
    };
  }
}
