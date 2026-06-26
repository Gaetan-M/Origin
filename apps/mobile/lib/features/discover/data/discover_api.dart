import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/features/discover/domain/cultural_content_item.dart';
import 'package:origin_mobile/features/discover/domain/cultural_enums.dart';

/// Thin dio wrapper over the PUBLIC culture-discovery endpoints.
///
/// Responses are already unwrapped from the NestJS `{ data, statusCode }`
/// envelope by the shared `_UnwrapInterceptor` (see `dio_client.dart`), so we
/// treat `response.data` as the raw payload.
class DiscoverApi {
  DiscoverApi(this._dio);

  final Dio _dio;

  /// GET /public-feed — cursor-paginated PUBLIC discovery feed of approved
  /// cultural-heritage content. Verified-authority content is prioritised
  /// server-side. Optional [contentType] facet filter.
  Future<CulturalFeedPage> getPublicFeed({
    String? cursor,
    int limit = 12,
    CulturalContentType? contentType,
  }) async {
    final res = await _dio.get<dynamic>(
      '/public-feed',
      queryParameters: <String, dynamic>{
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
        'limit': limit,
        if (contentType != null) 'contentType': contentType.wireName,
      },
    );
    final data = res.data;
    if (data is Map<String, dynamic>) {
      return CulturalFeedPage.fromJson(data);
    }
    if (data is List<dynamic>) {
      return CulturalFeedPage(
        items: data
            .whereType<Map<String, dynamic>>()
            .map(CulturalContentItem.fromJson)
            .toList(),
        nextCursor: null,
        hasMore: false,
      );
    }
    return const CulturalFeedPage(items: <CulturalContentItem>[], hasMore: false);
  }

  /// POST /cultural-content — submit a new cultural-heritage contribution. The
  /// server creates it as moderation_status=PENDING (community) and writes a
  /// Contribution audit row. Returns the created item.
  Future<CulturalContentItem> createCulturalContent(
    CreateCulturalContentInput input,
  ) async {
    final res = await _dio.post<dynamic>(
      '/cultural-content',
      data: input.toJson(),
    );
    final data = res.data;
    if (data is Map<String, dynamic>) {
      return CulturalContentItem.fromJson(data);
    }
    throw StateError('Unexpected response for POST /cultural-content');
  }
}

final Provider<DiscoverApi> discoverApiProvider = Provider<DiscoverApi>(
  (ref) => DiscoverApi(ref.watch(dioProvider)),
);
