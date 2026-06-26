// Riverpod providers driving the tourism (heritage places) UI.
//
// These public places are ONLINE-FIRST (no Drift cache), so the controller
// holds the fetched items directly in state and paginates by cursor. Filters
// (region / category / verifiedOnly) live in the state and trigger a reload.

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/features/explore/data/tourism_api.dart';
import 'package:origin_mobile/features/explore/domain/cursor_page.dart';
import 'package:origin_mobile/features/explore/domain/tourism_enums.dart';
import 'package:origin_mobile/features/explore/domain/tourism_place.dart';

@immutable
class TourismListState {
  const TourismListState({
    this.items = const <TourismPlace>[],
    this.region,
    this.category,
    this.verifiedOnly = false,
    this.isInitialLoading = false,
    this.isLoadingMore = false,
    this.isRefreshing = false,
    this.nextCursor,
    this.error,
  });

  final List<TourismPlace> items;

  // Active filters.
  final String? region;
  final TourismCategory? category;
  final bool verifiedOnly;

  final bool isInitialLoading;
  final bool isLoadingMore;
  final bool isRefreshing;

  final String? nextCursor;
  final Object? error;

  bool get hasMore => nextCursor != null && nextCursor!.isNotEmpty;

  TourismListState copyWith({
    List<TourismPlace>? items,
    Object? region = _noChange,
    Object? category = _noChange,
    bool? verifiedOnly,
    bool? isInitialLoading,
    bool? isLoadingMore,
    bool? isRefreshing,
    Object? nextCursor = _noChange,
    Object? error = _noChange,
  }) {
    return TourismListState(
      items: items ?? this.items,
      region: identical(region, _noChange) ? this.region : region as String?,
      category: identical(category, _noChange)
          ? this.category
          : category as TourismCategory?,
      verifiedOnly: verifiedOnly ?? this.verifiedOnly,
      isInitialLoading: isInitialLoading ?? this.isInitialLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      nextCursor: identical(nextCursor, _noChange)
          ? this.nextCursor
          : nextCursor as String?,
      error: identical(error, _noChange) ? this.error : error,
    );
  }

  static const Object _noChange = Object();
}

final NotifierProvider<TourismListController, TourismListState>
    tourismListControllerProvider =
    NotifierProvider<TourismListController, TourismListState>(
  TourismListController.new,
);

class TourismListController extends Notifier<TourismListState> {
  static const int _pageSize = 20;

  TourismApi get _api => ref.read(tourismApiProvider);

  @override
  TourismListState build() {
    Future<void>.microtask(_loadFirst);
    return const TourismListState(isInitialLoading: true);
  }

  Future<void> _loadFirst() async {
    try {
      final page = await _fetch(cursor: null);
      state = state.copyWith(
        items: page.items,
        nextCursor: page.nextCursor,
        isInitialLoading: false,
        isRefreshing: false,
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

  Future<CursorPage<TourismPlace>> _fetch({required String? cursor}) {
    return _api.getPlaces(
      cursor: cursor,
      limit: _pageSize,
      region: state.region,
      category: state.category,
      verifiedOnly: state.verifiedOnly,
    );
  }

  /// Pull-to-refresh — reloads the first page with the current filters.
  Future<void> refresh() async {
    state = state.copyWith(isRefreshing: true, error: null);
    await _loadFirst();
  }

  /// Loads the next cursor page (infinite scroll).
  Future<void> loadMore() async {
    if (state.isLoadingMore || state.isInitialLoading || !state.hasMore) {
      return;
    }
    state = state.copyWith(isLoadingMore: true);
    try {
      final page = await _fetch(cursor: state.nextCursor);
      state = state.copyWith(
        items: <TourismPlace>[...state.items, ...page.items],
        nextCursor: page.nextCursor,
        isLoadingMore: false,
      );
    } catch (_) {
      state = state.copyWith(isLoadingMore: false);
    }
  }

  /// Applies a new filter set and reloads from the first page.
  void setRegion(String? region) {
    final normalized = (region == null || region.trim().isEmpty)
        ? null
        : region.trim();
    if (normalized == state.region) return;
    state = state.copyWith(region: normalized);
    _reapplyFilters();
  }

  void setCategory(TourismCategory? category) {
    if (category == state.category) return;
    state = state.copyWith(category: category);
    _reapplyFilters();
  }

  void setVerifiedOnly(bool value) {
    if (value == state.verifiedOnly) return;
    state = state.copyWith(verifiedOnly: value);
    _reapplyFilters();
  }

  void _reapplyFilters() {
    state = state.copyWith(
      items: const <TourismPlace>[],
      nextCursor: null,
      isInitialLoading: true,
      error: null,
    );
    Future<void>.microtask(_loadFirst);
  }

  /// Submits a community place. On success the new place is prepended so the
  /// contributor sees it immediately (even though it is pending moderation).
  Future<TourismPlace> submit(SubmitTourismPlaceInput input) async {
    final created = await _api.submitPlace(input);
    state = state.copyWith(items: <TourismPlace>[created, ...state.items]);
    return created;
  }
}
