import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  LifeEventRecordedEvent,
  VisibilityScope,
} from '@origin/shared-types';
import { EventPublisher } from '../eventing/event-publisher';
import {
  SEARCH_INDEXER,
  SearchDocument,
  SearchIndexer,
  SearchScopeMeta,
} from './search-indexer.interface';

/** Logical search index that life events are written to. */
export const LIFE_EVENT_INDEX = 'life-events';

/**
 * Thin subscriber that bridges the domain-event stream to the search index.
 *
 * It listens for {@link LifeEventRecordedEvent} and upserts a corresponding
 * document into the search backend via the {@link SearchIndexer} abstraction.
 * Backed by the in-memory no-op today, so this wires the indexing pipeline
 * end-to-end without requiring Meilisearch to be online.
 *
 * The subscriber is deliberately transport-agnostic: it exposes a single
 * {@link handleLifeEventRecorded} method. The integrator connects it to whatever
 * event-dispatch mechanism the platform adopts (in-process bus, outbox poller,
 * EventEmitter2 `@OnEvent('life-event.recorded')`, etc.). No event bus exists in
 * the codebase yet, so no decorator is hard-wired here.
 */
@Injectable()
export class LifeEventIndexingSubscriber implements OnModuleInit {
  private readonly logger = new Logger(LifeEventIndexingSubscriber.name);

  constructor(
    @Inject(SEARCH_INDEXER) private readonly indexer: SearchIndexer,
    private readonly events: EventPublisher,
  ) {}

  /**
   * Wires the indexing pipeline to the event bus: every recorded life event is
   * upserted into the search index. Backed by the in-memory no-op indexer until
   * Meilisearch is provisioned, so this exercises the pipeline end-to-end today.
   */
  onModuleInit(): void {
    this.events.subscribe<LifeEventRecordedEvent>(
      'life-event.recorded',
      (event) => this.handleLifeEventRecorded(event),
    );
  }

  /**
   * Handle a recorded life event by indexing a searchable document for it.
   *
   * Visibility metadata defaults to FAMILY with the primary person as the
   * owner anchor (the first id in `personIds`). The richer per-event scope
   * (visibility_scope / visible_max_degree columns on LifeEvent) can be threaded
   * through once life events are persisted with their own scope — for now the
   * conservative FAMILY default keeps documents from leaking publicly.
   */
  async handleLifeEventRecorded(event: LifeEventRecordedEvent): Promise<void> {
    const { lifeEventId, kind, personIds } = event.payload;

    const ownerPersonId: string | null = personIds[0] ?? null;

    const doc: SearchDocument = {
      lifeEventId,
      kind,
      personIds,
      occurredAt: event.occurredAt,
      actorId: event.actorId,
    };

    const scopeMeta: SearchScopeMeta = {
      visibilityScope: VisibilityScope.FAMILY,
      ownerPersonId,
      visibleMaxDegree: null,
    };

    await this.indexer.indexDocument(
      LIFE_EVENT_INDEX,
      lifeEventId,
      doc,
      scopeMeta,
    );

    this.logger.debug(
      `indexed life-event ${lifeEventId} (kind=${kind}, persons=${personIds.length})`,
    );
  }
}
