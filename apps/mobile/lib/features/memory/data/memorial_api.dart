import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/features/memory/domain/memorial.dart';
import 'package:origin_mobile/features/memory/domain/visibility_scope.dart';

/// Thin dio wrapper over the `/memorial/*` endpoints.
///
/// Paths/params mirror the deployed web client
/// (`apps/web/src/lib/api/memorial.ts`). Responses are already unwrapped from
/// the NestJS envelope by the shared `_UnwrapInterceptor`.
class MemorialApi {
  MemorialApi(this._dio);

  final Dio _dio;

  Future<List<MemorialTribute>> getTributes(String personId) async {
    final res = await _dio.get<dynamic>('/memorial/$personId/tributes');
    final data = res.data;
    if (data is List<dynamic>) {
      return data
          .whereType<Map<String, dynamic>>()
          .map(MemorialTribute.fromJson)
          .toList();
    }
    return const <MemorialTribute>[];
  }

  Future<MemorialSummary> getSummary(String personId) async {
    final res = await _dio.get<dynamic>('/memorial/$personId/summary');
    return MemorialSummary.fromJson(res.data as Map<String, dynamic>);
  }

  Future<MemorialTribute> addTribute(
    String personId, {
    required MemorialTributeKind kind,
    String? message,
    String? mediaId,
    MemoryVisibilityScope visibilityScope = MemoryVisibilityScope.family,
  }) async {
    final res = await _dio.post<dynamic>(
      '/memorial/$personId/tributes',
      data: <String, dynamic>{
        'kind': kind.wire,
        if (message != null) 'message': message,
        if (mediaId != null) 'mediaId': mediaId,
        'visibilityScope': visibilityScope.wire,
      },
    );
    return MemorialTribute.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> deleteTribute(String tributeId) async {
    await _dio.delete<dynamic>('/memorial/tributes/$tributeId');
  }
}

final Provider<MemorialApi> memorialApiProvider =
    Provider<MemorialApi>((ref) => MemorialApi(ref.watch(dioProvider)));
