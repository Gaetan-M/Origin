// Riverpod providers driving the learning (mini-lessons) UI.
//
// Online-first (no Drift cache). The list controller holds fetched lessons and
// paginates by cursor with language/level filters. A per-lesson detail
// controller owns enroll + progress mutations, updating its own state in place.

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/features/explore/data/learning_api.dart';
import 'package:origin_mobile/features/explore/domain/cursor_page.dart';
import 'package:origin_mobile/features/explore/domain/learning_enums.dart';
import 'package:origin_mobile/features/explore/domain/learning_lesson.dart';

// ───────────────────────────── Lessons list ─────────────────────────────

@immutable
class LessonsListState {
  const LessonsListState({
    this.items = const <LearningLessonSummary>[],
    this.languageCode,
    this.level,
    this.isInitialLoading = false,
    this.isLoadingMore = false,
    this.isRefreshing = false,
    this.nextCursor,
    this.error,
  });

  final List<LearningLessonSummary> items;

  final String? languageCode;
  final LearningLevel? level;

  final bool isInitialLoading;
  final bool isLoadingMore;
  final bool isRefreshing;

  final String? nextCursor;
  final Object? error;

  bool get hasMore => nextCursor != null && nextCursor!.isNotEmpty;

  LessonsListState copyWith({
    List<LearningLessonSummary>? items,
    Object? languageCode = _noChange,
    Object? level = _noChange,
    bool? isInitialLoading,
    bool? isLoadingMore,
    bool? isRefreshing,
    Object? nextCursor = _noChange,
    Object? error = _noChange,
  }) {
    return LessonsListState(
      items: items ?? this.items,
      languageCode: identical(languageCode, _noChange)
          ? this.languageCode
          : languageCode as String?,
      level: identical(level, _noChange) ? this.level : level as LearningLevel?,
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

final NotifierProvider<LessonsListController, LessonsListState>
    lessonsListControllerProvider =
    NotifierProvider<LessonsListController, LessonsListState>(
  LessonsListController.new,
);

class LessonsListController extends Notifier<LessonsListState> {
  static const int _pageSize = 20;

  LearningApi get _api => ref.read(learningApiProvider);

  @override
  LessonsListState build() {
    Future<void>.microtask(_loadFirst);
    return const LessonsListState(isInitialLoading: true);
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

  Future<CursorPage<LearningLessonSummary>> _fetch({required String? cursor}) {
    return _api.getLessons(
      cursor: cursor,
      limit: _pageSize,
      languageCode: state.languageCode,
      level: state.level,
    );
  }

  Future<void> refresh() async {
    state = state.copyWith(isRefreshing: true, error: null);
    await _loadFirst();
  }

  Future<void> loadMore() async {
    if (state.isLoadingMore || state.isInitialLoading || !state.hasMore) {
      return;
    }
    state = state.copyWith(isLoadingMore: true);
    try {
      final page = await _fetch(cursor: state.nextCursor);
      state = state.copyWith(
        items: <LearningLessonSummary>[...state.items, ...page.items],
        nextCursor: page.nextCursor,
        isLoadingMore: false,
      );
    } catch (_) {
      state = state.copyWith(isLoadingMore: false);
    }
  }

  void setLanguageCode(String? code) {
    final normalized =
        (code == null || code.trim().isEmpty) ? null : code.trim();
    if (normalized == state.languageCode) return;
    state = state.copyWith(languageCode: normalized);
    _reapplyFilters();
  }

  void setLevel(LearningLevel? level) {
    if (level == state.level) return;
    state = state.copyWith(level: level);
    _reapplyFilters();
  }

  void _reapplyFilters() {
    state = state.copyWith(
      items: const <LearningLessonSummary>[],
      nextCursor: null,
      isInitialLoading: true,
      error: null,
    );
    Future<void>.microtask(_loadFirst);
  }
}

// ──────────────────────────── Lesson detail ────────────────────────────

final lessonDetailControllerProvider = NotifierProvider.family<
    LessonDetailController, AsyncValue<LearningLessonDetail>, String>(
  LessonDetailController.new,
);

class LessonDetailController
    extends FamilyNotifier<AsyncValue<LearningLessonDetail>, String> {
  LearningApi get _api => ref.read(learningApiProvider);

  String get _lessonId => arg;

  /// True while an enroll / progress mutation is in flight.
  bool isMutating = false;

  @override
  AsyncValue<LearningLessonDetail> build(String arg) {
    Future<void>.microtask(load);
    return const AsyncValue<LearningLessonDetail>.loading();
  }

  Future<void> load() async {
    state = const AsyncValue<LearningLessonDetail>.loading();
    try {
      final lesson = await _api.getLesson(_lessonId);
      state = AsyncValue<LearningLessonDetail>.data(lesson);
    } catch (error, stack) {
      state = AsyncValue<LearningLessonDetail>.error(error, stack);
    }
  }

  /// Enrols the caller and folds the returned enrollment into the lesson.
  Future<void> enroll() async {
    final current = state.valueOrNull;
    if (current == null || isMutating) return;
    isMutating = true;
    try {
      final enrollment = await _api.enroll(_lessonId);
      state =
          AsyncValue<LearningLessonDetail>.data(current.withEnrollment(enrollment));
    } finally {
      isMutating = false;
    }
  }

  /// Updates progress (0–100) and folds the returned enrollment in.
  Future<void> updateProgress(int progressPercent) async {
    final current = state.valueOrNull;
    if (current == null || isMutating) return;
    isMutating = true;
    try {
      final enrollment = await _api.updateProgress(_lessonId, progressPercent);
      state =
          AsyncValue<LearningLessonDetail>.data(current.withEnrollment(enrollment));
    } finally {
      isMutating = false;
    }
  }
}
