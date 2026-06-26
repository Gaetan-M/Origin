import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/features/explore/domain/cursor_page.dart';
import 'package:origin_mobile/features/explore/domain/tourism_enums.dart';
import 'package:origin_mobile/features/explore/domain/tourism_place.dart';

/// Thin dio wrapper over the PUBLIC `/tourism` endpoints.
///
/// Responses are already unwrapped from the NestJS `{ data, statusCode }`
/// envelope by the shared `_UnwrapInterceptor` (see `dio_client.dart`), so we
/// treat `response.data` as the raw payload. Mirrors the web `tourism.ts`
/// contract exactly.
class TourismApi {
  TourismApi(this._dio);

  final Dio _dio;

  /// GET /tourism — cursor-paginated PUBLIC list of heritage / tourism places.
  /// Verified, official-sourced places are prioritised server-side.
  Future<CursorPage<TourismPlace>> getPlaces({
    String? cursor,
    int? limit,
    String? region,
    TourismCategory? category,
    bool verifiedOnly = false,
  }) async {
    final res = await _dio.get<dynamic>(
      '/tourism',
      queryParameters: <String, dynamic>{
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
        if (limit != null) 'limit': limit,
        if (region != null && region.isNotEmpty) 'region': region,
        if (category != null) 'category': category.wireName,
        if (verifiedOnly) 'verifiedOnly': 'true',
      },
    );
    return CursorPage.fromResponse<TourismPlace>(
      res.data,
      TourismPlace.fromJson,
    );
  }

  /// GET /tourism/:id — single place detail.
  Future<TourismPlace> getPlace(String id) async {
    final res = await _dio.get<dynamic>('/tourism/$id');
    return TourismPlace.fromJson(res.data as Map<String, dynamic>);
  }

  /// POST /tourism — submit a community-sourced place. The server creates it as
  /// verified=false and routes it through moderation. Returns the created place.
  Future<TourismPlace> submitPlace(SubmitTourismPlaceInput input) async {
    final res = await _dio.post<dynamic>(
      '/tourism',
      data: input.toJson(),
    );
    return TourismPlace.fromJson(res.data as Map<String, dynamic>);
  }
}

final Provider<TourismApi> tourismApiProvider = Provider<TourismApi>(
  (ref) => TourismApi(ref.watch(dioProvider)),
);
