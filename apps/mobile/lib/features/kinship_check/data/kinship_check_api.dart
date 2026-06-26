import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/features/kinship_check/domain/kinship_check.dart';

/// Thin dio wrapper over the `/kinship-checks` endpoints powering the
/// "Sommes-nous parents ?" flow.
///
/// Responses are already unwrapped from the NestJS `{ data, statusCode }`
/// envelope by the shared `_UnwrapInterceptor` (see `dio_client.dart`), so we
/// treat `response.data` as the raw payload.
///
/// Mirrors the web contract in apps/web/src/lib/api/kinship-check.ts.
class KinshipCheckApi {
  KinshipCheckApi(this._dio);

  final Dio _dio;

  /// GET /kinship-checks — the caller's incoming + outgoing checks.
  Future<KinshipChecksOverview> getChecks() async {
    final res = await _dio.get<dynamic>('/kinship-checks');
    final data = res.data;
    if (data is Map<String, dynamic>) {
      return KinshipChecksOverview.fromJson(data);
    }
    return const KinshipChecksOverview(
      incoming: <KinshipCheckView>[],
      outgoing: <KinshipCheckView>[],
    );
  }

  /// POST /kinship-checks — open a new check (requester consent is implicit).
  Future<KinshipCheckView> initiate(InitiateKinshipCheckInput input) async {
    final res = await _dio.post<dynamic>(
      '/kinship-checks',
      data: input.toJson(),
    );
    return KinshipCheckView.fromJson(_asMap(res.data));
  }

  /// POST /kinship-checks/:id/consent — target grants consent. The server
  /// computes the result ONLY after this call (both parties now consent) and
  /// returns the updated view, including the privacy-safe result when ready.
  Future<KinshipCheckView> consent(String id) => _action(id, 'consent');

  /// POST /kinship-checks/:id/decline — target declines; no computation occurs.
  Future<KinshipCheckView> decline(String id) => _action(id, 'decline');

  /// POST /kinship-checks/:id/cancel — requester withdraws an outgoing check.
  Future<KinshipCheckView> cancel(String id) => _action(id, 'cancel');

  Future<KinshipCheckView> _action(String id, String action) async {
    final res = await _dio.post<dynamic>('/kinship-checks/$id/$action');
    return KinshipCheckView.fromJson(_asMap(res.data));
  }

  Map<String, dynamic> _asMap(Object? data) {
    if (data is Map<String, dynamic>) return data;
    return <String, dynamic>{};
  }
}

final Provider<KinshipCheckApi> kinshipCheckApiProvider =
    Provider<KinshipCheckApi>(
  (ref) => KinshipCheckApi(ref.watch(dioProvider)),
);
