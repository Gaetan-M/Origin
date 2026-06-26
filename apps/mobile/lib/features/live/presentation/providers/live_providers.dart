// Riverpod providers driving the LIVE (Phase 5) UI.
//
// These public features are online-first: there is NO Drift cache. Reads are
// plain `FutureProvider`s (refresh via `ref.invalidate`), and scheduling is a
// small `Notifier` that tracks an `isPending` flag and returns the created
// session so the caller can navigate to the room.

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/features/live/data/live_api.dart';
import 'package:origin_mobile/features/live/domain/live_session.dart';
import 'package:origin_mobile/features/live/domain/live_token.dart';

/// Every live session visible to the viewer (all statuses). The list screen
/// buckets them into live / upcoming / past locally.
final liveSessionsProvider = FutureProvider<List<LiveSession>>((ref) async {
  final api = ref.watch(liveApiProvider);
  return api.listSessions();
});

/// A single live session by id.
final liveSessionProvider =
    FutureProvider.family<LiveSession, String>((ref, id) async {
  final api = ref.watch(liveApiProvider);
  return api.getSession(id);
});

/// Join token for a live room. Returns a graceful `{ configured: false }`
/// response when the server has no LiveKit creds.
final liveTokenProvider =
    FutureProvider.family<LiveTokenResponse, String>((ref, id) async {
  final api = ref.watch(liveApiProvider);
  return api.getToken(id);
});

/// Replay playback URL for an ended, published session.
final liveReplayProvider =
    FutureProvider.family<LiveReplayResponse, String>((ref, id) async {
  final api = ref.watch(liveApiProvider);
  return api.getReplay(id);
});

/// State of the schedule-a-live action.
@immutable
class ScheduleLiveState {
  const ScheduleLiveState({this.isSubmitting = false, this.error});

  final bool isSubmitting;
  final Object? error;

  ScheduleLiveState copyWith({bool? isSubmitting, Object? error = _noChange}) {
    return ScheduleLiveState(
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: identical(error, _noChange) ? this.error : error,
    );
  }

  static const Object _noChange = Object();
}

final NotifierProvider<ScheduleLiveController, ScheduleLiveState>
    scheduleLiveControllerProvider =
    NotifierProvider<ScheduleLiveController, ScheduleLiveState>(
  ScheduleLiveController.new,
);

class ScheduleLiveController extends Notifier<ScheduleLiveState> {
  @override
  ScheduleLiveState build() => const ScheduleLiveState();

  /// Schedules a live session. On success refreshes the list and returns the
  /// created session; on failure records the error and returns null.
  Future<LiveSession?> submit(CreateLiveSessionInput input) async {
    state = state.copyWith(isSubmitting: true, error: null);
    try {
      final api = ref.read(liveApiProvider);
      final session = await api.createSession(input);
      state = state.copyWith(isSubmitting: false);
      // Surface the new session in the list on the way back.
      ref.invalidate(liveSessionsProvider);
      return session;
    } catch (error) {
      state = state.copyWith(isSubmitting: false, error: error);
      return null;
    }
  }
}
