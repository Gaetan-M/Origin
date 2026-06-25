import { Injectable, Logger } from '@nestjs/common';
import {
  SearchDocument,
  SearchIndexer,
  SearchScopeMeta,
} from './search-indexer.interface';

/** A document plus its access-control metadata, as held in memory. */
interface StoredDocument {
  readonly doc: SearchDocument;
  readonly scopeMeta: SearchScopeMeta;
}

/**
 * No-op / in-memory implementation of {@link SearchIndexer}.
 *
 * Used until Meilisearch is provisioned. It keeps documents in a process-local
 * map so the indexing pipeline can be exercised end-to-end (and unit-tested)
 * without external infrastructure. It performs NO query/search — querying is
 * deferred together with the real backend — but it does retain the visibility
 * metadata for every document so the contract (and tests) reflect the eventual
 * access-filtering behaviour.
 *
 * TODO(seam): replace this with a MeilisearchSearchIndexer adapter that talks to
 * a provisioned Meilisearch instance, translating SearchScopeMeta into index
 * filterable attributes (visibilityScope, ownerPersonId, visibleMaxDegree) so
 * queries can be pre-filtered by the caller's family-graph access.
 */
@Injectable()
export class InMemorySearchIndexer implements SearchIndexer {
  private readonly logger = new Logger(InMemorySearchIndexer.name);

  /** index name -> (document id -> stored document). */
  private readonly indexes = new Map<string, Map<string, StoredDocument>>();

  async indexDocument(
    index: string,
    id: string,
    doc: SearchDocument,
    scopeMeta: SearchScopeMeta,
  ): Promise<void> {
    const bucket = this.indexes.get(index) ?? new Map<string, StoredDocument>();
    bucket.set(id, { doc, scopeMeta });
    this.indexes.set(index, bucket);
    this.logger.debug(
      `[noop] indexed document index=${index} id=${id} scope=${scopeMeta.visibilityScope}`,
    );
  }

  async removeDocument(index: string, id: string): Promise<void> {
    const bucket = this.indexes.get(index);
    if (bucket) {
      bucket.delete(id);
    }
    this.logger.debug(`[noop] removed document index=${index} id=${id}`);
  }

  /**
   * Test/inspection helper — NOT part of the {@link SearchIndexer} contract.
   * Returns the stored document for an (index, id), or undefined.
   */
  peek(index: string, id: string): StoredDocument | undefined {
    return this.indexes.get(index)?.get(id);
  }

  /**
   * Test/inspection helper — NOT part of the {@link SearchIndexer} contract.
   * Returns the number of documents currently held in an index.
   */
  size(index: string): number {
    return this.indexes.get(index)?.size ?? 0;
  }
}
