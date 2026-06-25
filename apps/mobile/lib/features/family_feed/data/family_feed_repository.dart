// Offline-first family-feed repository.
//
// Read path : online with offline fallback. A successful network fetch writes
//             through to the Drift cache; on failure we serve the last-synced
//             cache so the feed renders with no connectivity.
// Write path: reactions and comments are applied OPTIMISTICALLY to the cache
//             and queued in the shared `SyncQueue` (FIFO, backoff, idempotent)
//             for push when connectivity returns.
//
// INTEGRATION: enqueues use two new `SyncEntityType` members — `feedReaction`
// and `feedComment` — which must be added to
// `lib/core/sync/sync_operation.dart` (enum + `wireName`) and handled in the
// exhaustive switches in `lib/core/sync/sync_queue.dart`. Dispatch handlers are
// provided in `family_feed_sync.dart`.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import 'package:origin_mobile/core/sync/sync_operation.dart';
import 'package:origin_mobile/core/sync/sync_queue.dart';
import 'package:origin_mobile/features/family_feed/data/family_feed_api.dart';
import 'package:origin_mobile/features/family_feed/data/family_feed_cache_dao.dart';
import 'package:origin_mobile/features/family_feed/data/family_feed_providers_data.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_comment.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_enums.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_post.dart';

const Uuid _uuid = Uuid();

/// Result of a feed page load — carries whether it came from the network or
/// the offline cache so the UI can surface an "offline" hint.
class FeedLoadResult {
  const FeedLoadResult({
    required this.posts,
    required this.fromCache,
    this.hasMore = false,
    this.page = 1,
  });

  final List<FeedPost> posts;
  final bool fromCache;
  final bool hasMore;
  final int page;
}

class FamilyFeedRepository {
  FamilyFeedRepository({
    required FamilyFeedApi api,
    required FamilyFeedCacheDao cache,
    required SyncQueue syncQueue,
    required String accountId,
  })  : _api = api,
        _cache = cache,
        _syncQueue = syncQueue,
        _accountId = accountId;

  final FamilyFeedApi _api;
  final FamilyFeedCacheDao _cache;
  final SyncQueue _syncQueue;
  final String _accountId;

  /// Reactive view of the cached feed — drives the UI even while a network
  /// refresh is in flight, and updates instantly on optimistic writes.
  Stream<List<FeedPost>> watchCachedFeed() => _cache.watchPosts(_accountId);

  Stream<List<FeedComment>> watchCachedComments(String postId) =>
      _cache.watchComments(postId);

  /// Loads one feed page. On page 1, a successful fetch replaces the cached
  /// server rows (pending local rows are preserved). On any failure we fall
  /// back to the cache (page 1) or an empty result (later pages).
  Future<FeedLoadResult> loadFeed({
    int page = 1,
    int limit = 20,
    int? maxDegree,
    bool dataSaver = false,
  }) async {
    // In low-data mode, tighten the visibility window to close family to keep
    // payloads (and media) small.
    final effectiveMaxDegree = maxDegree ?? (dataSaver ? 2 : null);
    try {
      final paginated = await _api.getFeed(
        page: page,
        limit: limit,
        maxDegree: effectiveMaxDegree,
      );
      if (page == 1) {
        await _cache.replaceServerPosts(_accountId, paginated.items);
      } else {
        await _cache.upsertPosts(_accountId, paginated.items);
      }
      final hasMore = paginated.totalPages != null
          ? page < paginated.totalPages!
          : paginated.items.length >= limit;
      return FeedLoadResult(
        posts: paginated.items,
        fromCache: false,
        hasMore: hasMore,
        page: page,
      );
    } catch (_) {
      if (page == 1) {
        final cached = await _cache.getPosts(_accountId);
        return FeedLoadResult(
          posts: cached,
          fromCache: true,
          hasMore: false,
          page: 1,
        );
      }
      rethrow;
    }
  }

  /// Loads comments for [postId] — network first, cache fallback. Successful
  /// fetches merge into the cache without dropping locally-pending comments.
  Future<List<FeedComment>> loadComments(
    String postId, {
    int limit = 50,
  }) async {
    try {
      final paginated = await _api.getComments(postId, limit: limit);
      await _cache.upsertComments(paginated.items);
      return _cache.getComments(postId);
    } catch (_) {
      return _cache.getComments(postId);
    }
  }

  /// Toggles the viewer's reaction. Applies the change optimistically to the
  /// cache and queues the network mutation.
  Future<void> toggleReaction(FeedPost post, FeedReactionType type) async {
    final current = post.myReaction;
    final bool removing = current == type;
    final FeedReactionType? nextReaction = removing ? null : type;

    // Optimistic count: removing -1, adding +1, switching net 0.
    var nextCount = post.reactionCount;
    if (removing) {
      nextCount = (nextCount - 1).clamp(0, 1 << 31);
    } else if (current == null) {
      nextCount = nextCount + 1;
    }

    final updated = post.copyWith(
      myReaction: nextReaction,
      reactionCount: nextCount,
    );
    await _cache.upsertPost(_accountId, updated, pending: post.pending);

    // If switching reaction types, first retract the previous one.
    if (!removing && current != null) {
      await _enqueueReaction(post.id, current, add: false);
    }
    await _enqueueReaction(post.id, type, add: !removing);
  }

  /// Adds a comment offline-first: writes a pending comment to the cache,
  /// bumps the post's comment count, and queues the push.
  Future<FeedComment> addComment(String postId, String body) async {
    final localId = 'local_${_uuid.v4()}';
    final comment = FeedComment(
      id: localId,
      feedPostId: postId,
      accountId: _accountId,
      body: body,
      createdAt: DateTime.now().toUtc(),
      pending: true,
    );
    await _cache.upsertComment(comment, pending: true);

    final post = await _cache.getPost(postId);
    if (post != null) {
      await _cache.upsertPost(
        _accountId,
        post.copyWith(commentCount: post.commentCount + 1),
        pending: post.pending,
      );
    }

    await _syncQueue.enqueue(
      SyncOperation(
        id: _uuid.v4(),
        entityType: SyncEntityType.feedComment,
        entityLocalId: localId,
        operationType: SyncOperationType.create,
        payload: <String, Object?>{
          'feedPostId': postId,
          'body': body,
          'localId': localId,
        },
        createdAt: DateTime.now().toUtc(),
      ),
    );
    // Best-effort immediate drain; the queue is a no-op offline.
    unawaited(_syncQueue.drain());
    return comment;
  }

  Future<void> _enqueueReaction(
    String postId,
    FeedReactionType type, {
    required bool add,
  }) async {
    await _syncQueue.enqueue(
      SyncOperation(
        id: _uuid.v4(),
        entityType: SyncEntityType.feedReaction,
        entityLocalId: 'local_${_uuid.v4()}',
        operationType:
            add ? SyncOperationType.create : SyncOperationType.delete,
        payload: <String, Object?>{
          'feedPostId': postId,
          'reactionType': type.wireName,
        },
        createdAt: DateTime.now().toUtc(),
      ),
    );
    unawaited(_syncQueue.drain());
  }
}

final Provider<FamilyFeedRepository?> familyFeedRepositoryProvider =
    Provider<FamilyFeedRepository?>((ref) {
  final accountId = ref.watch(currentAccountIdProvider);
  if (accountId == null) {
    return null;
  }
  return FamilyFeedRepository(
    api: ref.watch(familyFeedApiProvider),
    cache: ref.watch(familyFeedCacheDaoProvider),
    syncQueue: ref.watch(syncQueueProvider),
    accountId: accountId,
  );
});

/// Local fire-and-forget helper (kept local to avoid a hard dependency on
/// `dart:async`'s `unawaited` import in callers).
void unawaited(Future<void> future) {
  future.then<void>((_) {}, onError: (Object _) {});
}
