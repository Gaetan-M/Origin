import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/data/models/paginated.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_comment.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_enums.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_post.dart';

/// Thin dio wrapper over the family-feed endpoints.
///
/// Responses are already unwrapped from the NestJS `{ data, statusCode }`
/// envelope by the shared `_UnwrapInterceptor` (see `dio_client.dart`), so we
/// treat `response.data` as the raw payload.
class FamilyFeedApi {
  FamilyFeedApi(this._dio);

  final Dio _dio;

  /// Paginated family feed. The backend applies degree-bounded FAMILY
  /// visibility; [maxDegree] lets the client request a tighter window (e.g.
  /// "close family only") when on low-data connections.
  Future<Paginated<FeedPost>> getFeed({
    int page = 1,
    int limit = 20,
    int? maxDegree,
  }) async {
    final res = await _dio.get<dynamic>(
      '/family-feed',
      queryParameters: <String, dynamic>{
        'page': page,
        'limit': limit,
        if (maxDegree != null) 'maxDegree': maxDegree,
      },
    );
    return _toPaginated(
      res.data,
      (json) => FeedPost.fromJson(json as Map<String, dynamic>),
    );
  }

  /// Comments for a single post (newest last).
  Future<Paginated<FeedComment>> getComments(
    String postId, {
    int page = 1,
    int limit = 50,
  }) async {
    final res = await _dio.get<dynamic>(
      '/family-feed/$postId/comments',
      queryParameters: <String, dynamic>{'page': page, 'limit': limit},
    );
    return _toPaginated(
      res.data,
      (json) => FeedComment.fromJson(json as Map<String, dynamic>),
    );
  }

  /// Adds (or replaces) the viewer's reaction. Returns the server reaction id.
  Future<String> addReaction(String postId, FeedReactionType type) async {
    final res = await _dio.post<dynamic>(
      '/family-feed/$postId/reactions',
      data: <String, dynamic>{'reactionType': type.wireName},
    );
    final data = res.data;
    if (data is Map<String, dynamic>) {
      return data['id'] as String? ?? '';
    }
    return '';
  }

  /// Removes the viewer's reaction of [type] from a post.
  Future<void> removeReaction(String postId, FeedReactionType type) async {
    await _dio.delete<dynamic>(
      '/family-feed/$postId/reactions',
      queryParameters: <String, dynamic>{'reactionType': type.wireName},
    );
  }

  /// Posts a comment. Returns the server comment id.
  Future<String> addComment(String postId, String body) async {
    final res = await _dio.post<dynamic>(
      '/family-feed/$postId/comments',
      data: <String, dynamic>{'body': body},
    );
    final data = res.data;
    if (data is Map<String, dynamic>) {
      return data['id'] as String? ?? '';
    }
    return '';
  }

  Paginated<T> _toPaginated<T>(
    Object? data,
    T Function(Object? json) fromJsonT,
  ) {
    if (data is Map<String, dynamic>) {
      return paginatedFromBackend<T>(data, fromJsonT);
    }
    if (data is List<dynamic>) {
      final items = data.map(fromJsonT).toList();
      return Paginated<T>(
        items: items,
        page: 1,
        limit: items.length,
        total: items.length,
      );
    }
    return Paginated<T>(items: const [], page: 1, limit: 0, total: 0);
  }
}

final Provider<FamilyFeedApi> familyFeedApiProvider = Provider<FamilyFeedApi>(
  (ref) => FamilyFeedApi(ref.watch(dioProvider)),
);
