// DAO over the offline family-feed cache tables (FeedPostsCache /
// FeedCommentsCache).
//
// INTEGRATION: compiles once `FeedPostsCache` / `FeedCommentsCache` (from
// `family_feed_tables.dart`) are registered in `app_database.dart` and codegen
// has run — the generated `$FeedPostsCacheTable`, `FeedPostsCacheData`,
// `FeedPostsCacheCompanion` (+ comment equivalents) and the `feedPostsCache` /
// `feedCommentsCache` accessors on `AppDatabase` come from drift's build step.

import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:origin_mobile/core/storage/app_database.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_comment.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_post.dart';

class FamilyFeedCacheDao {
  FamilyFeedCacheDao(this._db);

  final AppDatabase _db;

  // ── Posts ────────────────────────────────────────────────────────────────

  FeedPostsCacheCompanion _postToCompanion(
    String accountId,
    FeedPost post, {
    bool pending = false,
  }) {
    final now = DateTime.now().toUtc();
    return FeedPostsCacheCompanion.insert(
      id: post.id,
      accountId: accountId,
      subjectPersonId: Value(post.subjectPersonId),
      postType: post.postType.wireName,
      sortAt: post.sortAt,
      createdAt: post.createdAt,
      rawJson: jsonEncode(post.toJson()),
      pending: Value(pending || post.pending),
      cachedAt: now,
    );
  }

  /// Replaces the cached feed page for [accountId] with [posts] in one batch.
  /// Locally-pending rows are preserved (they are never part of a server page).
  Future<void> upsertPosts(String accountId, List<FeedPost> posts) async {
    if (posts.isEmpty) return;
    await _db.batch((b) {
      b.insertAllOnConflictUpdate(
        _db.feedPostsCache,
        posts.map((p) => _postToCompanion(accountId, p)).toList(),
      );
    });
  }

  /// Inserts/updates a single post (used for optimistic local mutations).
  Future<void> upsertPost(
    String accountId,
    FeedPost post, {
    bool pending = false,
  }) async {
    await _db.into(_db.feedPostsCache).insertOnConflictUpdate(
          _postToCompanion(accountId, post, pending: pending),
        );
  }

  Future<List<FeedPost>> getPosts(String accountId, {int limit = 100}) async {
    final rows = await (_db.select(_db.feedPostsCache)
          ..where((t) => t.accountId.equals(accountId))
          ..orderBy(<OrderClauseGenerator<$FeedPostsCacheTable>>[
            (t) => OrderingTerm(expression: t.sortAt, mode: OrderingMode.desc),
          ])
          ..limit(limit))
        .get();
    return rows.map(_rowToPost).toList();
  }

  Stream<List<FeedPost>> watchPosts(String accountId, {int limit = 100}) {
    return (_db.select(_db.feedPostsCache)
          ..where((t) => t.accountId.equals(accountId))
          ..orderBy(<OrderClauseGenerator<$FeedPostsCacheTable>>[
            (t) => OrderingTerm(expression: t.sortAt, mode: OrderingMode.desc),
          ])
          ..limit(limit))
        .watch()
        .map((rows) => rows.map(_rowToPost).toList());
  }

  Future<FeedPost?> getPost(String id) async {
    final row = await (_db.select(_db.feedPostsCache)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();
    return row == null ? null : _rowToPost(row);
  }

  /// Removes server rows for [accountId] but keeps locally-pending ones, so a
  /// full refresh never drops offline-authored content awaiting sync.
  Future<void> replaceServerPosts(
    String accountId,
    List<FeedPost> posts,
  ) async {
    await _db.transaction(() async {
      await (_db.delete(_db.feedPostsCache)
            ..where((t) => t.accountId.equals(accountId) & t.pending.equals(false)))
          .go();
      await upsertPosts(accountId, posts);
    });
  }

  Future<void> clearForAccount(String accountId) async {
    await (_db.delete(_db.feedPostsCache)
          ..where((t) => t.accountId.equals(accountId)))
        .go();
  }

  FeedPost _rowToPost(FeedPostsCacheData row) {
    final json = jsonDecode(row.rawJson) as Map<String, dynamic>;
    return FeedPost.fromJson(json);
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  FeedCommentsCacheCompanion _commentToCompanion(
    FeedComment comment, {
    bool pending = false,
  }) {
    return FeedCommentsCacheCompanion.insert(
      id: comment.id,
      feedPostId: comment.feedPostId,
      accountId: comment.accountId,
      createdAt: comment.createdAt,
      rawJson: jsonEncode(comment.toJson()),
      pending: Value(pending || comment.pending),
      cachedAt: DateTime.now().toUtc(),
    );
  }

  Future<void> upsertComments(List<FeedComment> comments) async {
    if (comments.isEmpty) return;
    await _db.batch((b) {
      b.insertAllOnConflictUpdate(
        _db.feedCommentsCache,
        comments.map((c) => _commentToCompanion(c)).toList(),
      );
    });
  }

  Future<void> upsertComment(FeedComment comment, {bool pending = false}) async {
    await _db.into(_db.feedCommentsCache).insertOnConflictUpdate(
          _commentToCompanion(comment, pending: pending),
        );
  }

  Future<List<FeedComment>> getComments(String postId) async {
    final rows = await (_db.select(_db.feedCommentsCache)
          ..where((t) => t.feedPostId.equals(postId))
          ..orderBy(<OrderClauseGenerator<$FeedCommentsCacheTable>>[
            (t) => OrderingTerm(expression: t.createdAt),
          ]))
        .get();
    return rows.map(_rowToComment).toList();
  }

  Stream<List<FeedComment>> watchComments(String postId) {
    return (_db.select(_db.feedCommentsCache)
          ..where((t) => t.feedPostId.equals(postId))
          ..orderBy(<OrderClauseGenerator<$FeedCommentsCacheTable>>[
            (t) => OrderingTerm(expression: t.createdAt),
          ]))
        .watch()
        .map((rows) => rows.map(_rowToComment).toList());
  }

  /// Rewrites a locally-created comment id once the server assigns the real id.
  Future<void> rewriteCommentId({
    required String oldId,
    required String newId,
  }) async {
    final existing = await (_db.select(_db.feedCommentsCache)
          ..where((t) => t.id.equals(oldId)))
        .getSingleOrNull();
    if (existing == null) return;
    final comment = _rowToComment(existing).copyWith(id: newId, pending: false);
    await _db.transaction(() async {
      await (_db.delete(_db.feedCommentsCache)..where((t) => t.id.equals(oldId)))
          .go();
      await upsertComment(comment);
    });
  }

  Future<void> markCommentSynced(String id) async {
    final existing = await (_db.select(_db.feedCommentsCache)
          ..where((t) => t.id.equals(id)))
        .getSingleOrNull();
    if (existing == null) return;
    await upsertComment(_rowToComment(existing).copyWith(pending: false));
  }

  FeedComment _rowToComment(FeedCommentsCacheData row) {
    final json = jsonDecode(row.rawJson) as Map<String, dynamic>;
    return FeedComment.fromJson(json);
  }
}
