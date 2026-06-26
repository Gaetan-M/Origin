import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/features/live/domain/live_enums.dart';
import 'package:origin_mobile/features/live/domain/live_session.dart';
import 'package:origin_mobile/features/live/domain/live_token.dart';

/// Thin dio wrapper over the LIVE (Phase 5) endpoints.
///
/// Responses are already unwrapped from the NestJS `{ data, statusCode }`
/// envelope by the shared `_UnwrapInterceptor` (see `dio_client.dart`), so we
/// treat `response.data` as the raw payload.
///
/// LiveKit is NEVER touched here: the client only ever receives a short-lived
/// ACCESS TOKEN minted server-side. When LiveKit env creds are unset the API
/// answers `{ configured: false }` and the UI degrades to a graceful
/// "coming soon" state — it must never crash.
class LiveApi {
  LiveApi(this._dio);

  final Dio _dio;

  /// GET /live — every live session visible to the viewer.
  /// Optional [status] filter narrows to a single lifecycle state.
  Future<List<LiveSession>> listSessions({LiveSessionStatus? status}) async {
    final res = await _dio.get<dynamic>(
      '/live',
      queryParameters: <String, dynamic>{
        if (status != null) 'status': status.wireName,
      },
    );
    final data = res.data;
    if (data is List<dynamic>) {
      return data
          .whereType<Map<String, dynamic>>()
          .map(LiveSession.fromJson)
          .toList();
    }
    return const <LiveSession>[];
  }

  /// GET /live/:id — a single live session.
  Future<LiveSession> getSession(String id) async {
    final res = await _dio.get<dynamic>('/live/$id');
    return LiveSession.fromJson(res.data as Map<String, dynamic>);
  }

  /// POST /live — schedule a new live session.
  Future<LiveSession> createSession(CreateLiveSessionInput input) async {
    final res = await _dio.post<dynamic>('/live', data: input.toJson());
    return LiveSession.fromJson(res.data as Map<String, dynamic>);
  }

  /// GET /live/:id/token — mint (or refresh) the caller's join token.
  Future<LiveTokenResponse> getToken(String id) async {
    final res = await _dio.get<dynamic>('/live/$id/token');
    final data = res.data;
    if (data is Map<String, dynamic>) {
      return LiveTokenResponse.fromJson(data);
    }
    return const LiveTokenResponse(configured: false);
  }

  /// GET /live/:id/replay — the replay playback URL for an ended, published
  /// session.
  Future<LiveReplayResponse> getReplay(String id) async {
    final res = await _dio.get<dynamic>('/live/$id/replay');
    final data = res.data;
    if (data is Map<String, dynamic>) {
      return LiveReplayResponse.fromJson(data);
    }
    return const LiveReplayResponse(mediaKind: LiveReplayMediaKind.audio);
  }
}

final Provider<LiveApi> liveApiProvider = Provider<LiveApi>(
  (ref) => LiveApi(ref.watch(dioProvider)),
);
