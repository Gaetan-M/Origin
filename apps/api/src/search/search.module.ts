import { Module } from '@nestjs/common';
import { InMemorySearchIndexer } from './in-memory-search-indexer';
import { LifeEventIndexingSubscriber } from './life-event-indexing.subscriber';
import { SEARCH_INDEXER } from './search-indexer.interface';

/**
 * Search seam.
 *
 * Binds the {@link SEARCH_INDEXER} token to the in-memory no-op implementation
 * and exposes the life-event indexing subscriber. The real backend (Meilisearch)
 * is deferred: swapping it in is a single `useClass` change here, with no impact
 * on call sites that depend on the SEARCH_INDEXER token.
 */
@Module({
  providers: [
    { provide: SEARCH_INDEXER, useClass: InMemorySearchIndexer },
    LifeEventIndexingSubscriber,
  ],
  exports: [SEARCH_INDEXER, LifeEventIndexingSubscriber],
})
export class SearchModule {}
