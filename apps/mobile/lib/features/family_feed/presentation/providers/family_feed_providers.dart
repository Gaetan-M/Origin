// Riverpod providers driving the family-feed UI.
//
// Display is sourced from the Drift cache stream ([familyFeedStreamProvider]),
// so the feed renders instantly offline and updates live on optimistic writes.
// [FamilyFeedController] owns the *network sync* lifecycle (initial load,
// pagination, refresh) and writes through to the cache; the stream picks up the
// result. This keeps reads reactive and writes offline-safe.

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/features/family_feed/data/family_feed_providers_data.dart';
import 'package:origin_mobile/features/family_feed/data/family_feed_repository.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_comment.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_enums.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_post.dart';

/// Live view of the cached feed for the current viewer.
final StreamProvider<List<FeedPost>> familyFeedStreamProvider =
    StreamProvider<List<FeedPost>>((ref) {
  final repo = ref.watch(familyFeedRepositoryProvider);
  if (repo == null) {
    return Stream<List<FeedPost>>.value(const <FeedPost>[]);
  }
  return repo.watchCachedFeed();
});

/// Network-sync state for the feed (separate from the cached content).
@immutable
class FamilyFeedSyncState {
  const FamilyFeedSyncState({
    this.isInitialLoading = false,
    this.isLoadingMore = false,
    this.isRefreshing = false,
    this.isOffline = false,
    this.hasMore = true,
    this.page = 0,
    this.error,
  });

  final bool isInitialLoading;
  final bool isLoadingMore;
  final bool isRefreshing;
  final bool isOffline;
  final bool hasMore;
  final int page;
  final Object? error;

  FamilyFeedSyncState copyWith({
    bool? isInitialLoading,
    bool? isLoadingMore,
    bool? isRefreshing,
    bool? isOffline,
    bool? hasMore,
    int? page,
    Object? error = _noChange,
  }) {
    return FamilyFeedSyncState(
      isInitialLoading: isInitialLoading ?? this.isInitialLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isOffline: isOffline ?? this.isOffline,
      hasMore: hasMore ?? this.hasMore,
      page: page ?? this.page,
      error: identical(error, _noChange) ? this.error : error,
    );
  }

  static const Object _noChange = Object();
}

final NotifierProvider<FamilyFeedController, FamilyFeedSyncState>
    familyFeedControllerProvider =
    NotifierProvider<FamilyFeedController, FamilyFeedSyncState>(
  FamilyFeedController.new,
);

class FamilyFeedController extends Notifier<FamilyFeedSyncState> {
  static const int _pageSize = 20;

  @override
  FamilyFeedSyncState build() {
    // Kick off the first network sync after construction.
    Future<void>.microtask(refresh);
    return const FamilyFeedSyncState(isInitialLoading: true);
  }

  FamilyFeedRepository? get _repo => ref.read(familyFeedRepositoryProvider);
  bool get _dataSaver => ref.read(feedDataSaverProvider);

  /// Re-fetches the first page from the network (pull-to-refresh / boot).
  Future<void> refresh() async {
    final repo = _repo;
    if (repo == null) {
      state = state.copyWith(isInitialLoading: false);
      return;
    }
    state = state.copyWith(
      isRefreshing: true,
      error: null,
    );
    try {
      final result = await repo.loadFeed(
        page: 1,
        limit: _pageSize,
        dataSaver: _dataSaver,
      );
      state = state.copyWith(
        isInitialLoading: false,
        isRefreshing: false,
        isOffline: result.fromCache,
        hasMore: result.hasMore,
        page: 1,
        error: null,
      );
    } catch (error) {
      state = state.copyWith(
        isInitialLoading: false,
        isRefreshing: false,
        error: error,
      );
    }
  }

  /// Loads the next page (infinite scroll). No-op while already loading or when
  /// the last page returned came from cache (offline).
  Future<void> loadMore() async {
    final repo = _repo;
    if (repo == null ||
        state.isLoadingMore ||
        state.isInitialLoading ||
        state.isOffline ||
        !state.hasMore) {
      return;
    }
    final nextPage = state.page + 1;
    state = state.copyWith(isLoadingMore: true);
    try {
      final result = await repo.loadFeed(
        page: nextPage,
        limit: _pageSize,
        dataSaver: _dataSaver,
      );
      state = state.copyWith(
        isLoadingMore: false,
        hasMore: result.hasMore,
        page: nextPage,
      );
    } catch (_) {
      // Stay on the current page; a later refresh recovers.
      state = state.copyWith(isLoadingMore: false);
    }
  }

  /// Toggles the viewer's reaction (optimistic + queued offline).
  Future<void> toggleReaction(FeedPost post, FeedReactionType type) async {
    await _repo?.toggleReaction(post, type);
  }
}

/// Comments for a single post — cache stream merged with a background fetch.
final familyFeedCommentsProvider =
    StreamProvider.family<List<FeedComment>, String>((ref, postId) {
  final repo = ref.watch(familyFeedRepositoryProvider);
  if (repo == null) {
    return Stream<List<FeedComment>>.value(const <FeedComment>[]);
  }
  // Fire a background refresh; the cache stream surfaces the result.
  Future<void>.microtask(() => repo.loadComments(postId));
  return repo.watchCachedComments(postId);
});

/// Imperative comment composer hook used by the comments sheet.
final Provider<Future<void> Function(String postId, String body)>
    addFeedCommentProvider =
    Provider<Future<void> Function(String, String)>((ref) {
  return (String postId, String body) async {
    final repo = ref.read(familyFeedRepositoryProvider);
    if (repo == null) return;
    await repo.addComment(postId, body);
  };
});
