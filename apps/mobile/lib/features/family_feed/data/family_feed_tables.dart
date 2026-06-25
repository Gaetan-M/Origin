// Drift table definitions for the offline family-feed cache.
//
// INTEGRATION: these two tables must be registered in the `@DriftDatabase`
// `tables:` list in `lib/core/storage/app_database.dart` and the database
// `schemaVersion` bumped (+ a migration step) so codegen emits the
// `$FeedPostsCacheTable` / `FeedPostsCacheData` / `FeedPostsCacheCompanion`
// (and comment equivalents) used by `FamilyFeedCacheDao`.
//
// We store the fully-rendered post/comment as JSON in `rawJson` (lossless
// round-trip of the domain model) plus a handful of indexed columns used for
// ordering and per-viewer scoping. This keeps the cache schema stable even as
// the feed payload grows, and makes offline reads a single indexed query.

import 'package:drift/drift.dart';

/// Last-synced feed posts, scoped per viewer account.
class FeedPostsCache extends Table {
  TextColumn get id => text()();

  /// Viewer account this cache row belongs to (feed is per-viewer).
  TextColumn get accountId => text()();

  /// Visibility owner (the person the post is about). Nullable for non-event
  /// posts.
  TextColumn get subjectPersonId => text().nullable()();

  TextColumn get postType => text()();

  /// Ordering key — event time if present, else creation time (ISO-8601).
  DateTimeColumn get sortAt => dateTime()();

  DateTimeColumn get createdAt => dateTime()();

  /// Full domain model serialised as JSON.
  TextColumn get rawJson => text()();

  /// True when the row was created locally and not yet confirmed by the server.
  BoolColumn get pending => boolean().withDefault(const Constant(false))();

  /// When this row was last written from a server sync.
  DateTimeColumn get cachedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Last-synced (and locally-pending) comments per post.
class FeedCommentsCache extends Table {
  TextColumn get id => text()();
  TextColumn get feedPostId => text()();
  TextColumn get accountId => text()();
  DateTimeColumn get createdAt => dateTime()();
  TextColumn get rawJson => text()();
  BoolColumn get pending => boolean().withDefault(const Constant(false))();
  DateTimeColumn get cachedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}
