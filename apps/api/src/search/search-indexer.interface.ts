import { VisibilityScope } from '@origin/shared-types';

/**
 * Injection token for the {@link SearchIndexer} contract.
 *
 * The concrete binding is decided at module-composition time (see SearchModule).
 * Today it resolves to the in-memory no-op implementation; once Meilisearch is
 * provisioned the binding swaps to the Meilisearch adapter with no change to
 * call sites.
 */
export const SEARCH_INDEXER = Symbol('SEARCH_INDEXER');

/**
 * Access-control metadata that MUST travel with every indexed document.
 *
 * Search is part of the visibility surface: a document that is searchable is a
 * document that can leak. Every indexed payload therefore carries its own
 * visibility scope and, for FAMILY-scoped documents, the owner person and the
 * maximum family-graph degree at which the document remains visible. The future
 * Meilisearch adapter uses these fields to build per-query filters so that
 * results are pre-filtered by the caller's access before they ever leave the
 * index. No document may be indexed without this metadata.
 */
export interface SearchScopeMeta {
  /** Visibility scope governing who may see this document. */
  visibilityScope: VisibilityScope;
  /**
   * Owner person id used as the anchor for FAMILY-degree checks.
   * Required when visibilityScope is FAMILY; ignored for PUBLIC / PRIVATE_SELF.
   */
  ownerPersonId: string | null;
  /**
   * Maximum family-graph degree (BFS distance from ownerPersonId) at which a
   * FAMILY-scoped document stays visible. Null means "no degree bound" within
   * the FAMILY scope. Ignored for non-FAMILY scopes.
   */
  visibleMaxDegree: number | null;
}

/**
 * A document payload to be indexed. Free-form field bag — each index defines its
 * own shape — but the access-control metadata is mandatory and namespaced under
 * {@link SearchScopeMeta} so it can never be confused with business fields.
 */
export type SearchDocument = Record<string, unknown>;

/**
 * Abstraction over the full-text search backend.
 *
 * The platform codes exclusively against this interface; the backend (in-memory
 * no-op today, Meilisearch tomorrow) is an implementation detail bound by DI.
 *
 * Indexes are addressed by a logical name (e.g. 'persons', 'life-events',
 * 'feed-posts'). Document ids are stable, caller-owned strings (typically the
 * entity uuid). All operations are idempotent.
 */
export interface SearchIndexer {
  /**
   * Upserts a document into an index together with its visibility metadata.
   *
   * Implementations MUST persist {@link SearchScopeMeta} alongside the document
   * so that future queries can filter by the caller's access. Calling again with
   * the same (index, id) replaces the previous document.
   */
  indexDocument(
    index: string,
    id: string,
    doc: SearchDocument,
    scopeMeta: SearchScopeMeta,
  ): Promise<void>;

  /**
   * Removes a document from an index. Idempotent: removing an unknown id is a
   * no-op and never throws.
   */
  removeDocument(index: string, id: string): Promise<void>;
}
