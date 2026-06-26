// Riverpod providers driving the PUBLIC culture-discovery UI.
//
// These public features are ONLINE-FIRST (no Drift cache): the controller owns
// the cursor-paginated network list directly. Manual providers only (no
// codegen) to stay parallel-safe.

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/features/discover/data/discover_api.dart';
import 'package:origin_mobile/features/discover/domain/cultural_content_item.dart';
import 'package:origin_mobile/features/discover/domain/cultural_enums.dart';

/// Immutable state for the cursor-paginated discovery feed.
@immutable
class DiscoverFeedState {
  const DiscoverFeedState({
    this.items = const <CulturalContentItem>[],
    this.contentType,
    this.isInitialLoading = false,
    this.isRefreshing = false,
    this.isLoadingMore = false,
    this.hasMore = true,
    this.nextCursor,
    this.error,
  });

  final List<CulturalContentItem> items;

  /// Active content-type facet filter (null = "All").
  final CulturalContentType? contentType;

  final bool isInitialLoading;
  final bool isRefreshing;
  final bool isLoadingMore;
  final bool hasMore;
  final String? nextCursor;
  final Object? error;

  bool get isEmpty => items.isEmpty;

  DiscoverFeedState copyWith({
    List<CulturalContentItem>? items,
    Object? contentType = _noChange,
    bool? isInitialLoading,
    bool? isRefreshing,
    bool? isLoadingMore,
    bool? hasMore,
    Object? nextCursor = _noChange,
    Object? error = _noChange,
  }) {
    return DiscoverFeedState(
      items: items ?? this.items,
      contentType: identical(contentType, _noChange)
          ? this.contentType
          : contentType as CulturalContentType?,
      isInitialLoading: isInitialLoading ?? this.isInitialLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      nextCursor: identical(nextCursor, _noChange)
          ? this.nextCursor
          : nextCursor as String?,
      error: identical(error, _noChange) ? this.error : error,
    );
  }

  static const Object _noChange = Object();
}

final NotifierProvider<DiscoverFeedController, DiscoverFeedState>
    discoverFeedControllerProvider =
    NotifierProvider<DiscoverFeedController, DiscoverFeedState>(
  DiscoverFeedController.new,
);

class DiscoverFeedController extends Notifier<DiscoverFeedState> {
  static const int _pageSize = 12;

  @override
  DiscoverFeedState build() {
    Future<void>.microtask(refresh);
    return const DiscoverFeedState(isInitialLoading: true);
  }

  DiscoverApi get _api => ref.read(discoverApiProvider);

  /// Re-fetches the first page (pull-to-refresh / boot / filter change).
  Future<void> refresh() async {
    state = state.copyWith(
      isRefreshing: !state.isInitialLoading,
      error: null,
    );
    try {
      final page = await _api.getPublicFeed(
        cursor: null,
        limit: _pageSize,
        contentType: state.contentType,
      );
      state = state.copyWith(
        items: page.items,
        isInitialLoading: false,
        isRefreshing: false,
        hasMore: page.hasMore,
        nextCursor: page.nextCursor,
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

  /// Loads the next page (infinite scroll). No-op while already loading or done.
  Future<void> loadMore() async {
    if (state.isLoadingMore ||
        state.isInitialLoading ||
        state.isRefreshing ||
        !state.hasMore ||
        state.nextCursor == null) {
      return;
    }
    state = state.copyWith(isLoadingMore: true);
    try {
      final page = await _api.getPublicFeed(
        cursor: state.nextCursor,
        limit: _pageSize,
        contentType: state.contentType,
      );
      state = state.copyWith(
        items: <CulturalContentItem>[...state.items, ...page.items],
        isLoadingMore: false,
        hasMore: page.hasMore,
        nextCursor: page.nextCursor,
      );
    } catch (_) {
      // Stay on the current page; a later scroll / refresh recovers.
      state = state.copyWith(isLoadingMore: false);
    }
  }

  /// Switches the content-type facet and reloads from the first page.
  Future<void> setContentType(CulturalContentType? type) async {
    if (type == state.contentType) return;
    state = state.copyWith(
      contentType: type,
      items: const <CulturalContentItem>[],
      isInitialLoading: true,
      hasMore: true,
      nextCursor: null,
      error: null,
    );
    await refresh();
  }
}

/// Imperative submit state for the cultural-content form.
@immutable
class SubmitContentState {
  const SubmitContentState({this.isSubmitting = false, this.error});

  final bool isSubmitting;
  final Object? error;

  SubmitContentState copyWith({bool? isSubmitting, Object? error = _noChange}) {
    return SubmitContentState(
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: identical(error, _noChange) ? this.error : error,
    );
  }

  static const Object _noChange = Object();
}

final NotifierProvider<SubmitContentController, SubmitContentState>
    submitContentControllerProvider =
    NotifierProvider<SubmitContentController, SubmitContentState>(
  SubmitContentController.new,
);

class SubmitContentController extends Notifier<SubmitContentState> {
  @override
  SubmitContentState build() => const SubmitContentState();

  /// Submits a new contribution. Returns true on success. On success the
  /// discovery feed is refreshed so the (pending) author can see context.
  Future<bool> submit(CreateCulturalContentInput input) async {
    state = state.copyWith(isSubmitting: true, error: null);
    try {
      await ref.read(discoverApiProvider).createCulturalContent(input);
      state = state.copyWith(isSubmitting: false, error: null);
      // Refresh the feed (approved content may change ordering server-side).
      unawaited(ref.read(discoverFeedControllerProvider.notifier).refresh());
      return true;
    } catch (error) {
      state = state.copyWith(isSubmitting: false, error: error);
      return false;
    }
  }
}
