import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/features/memory/domain/album.dart';
import 'package:origin_mobile/features/memory/domain/visibility_scope.dart';

/// Thin dio wrapper over the `/albums/*` endpoints.
///
/// Responses are already unwrapped from the NestJS `{ data, statusCode }`
/// envelope by the shared `_UnwrapInterceptor` (see `dio_client.dart`), so we
/// treat `response.data` as the raw payload. Paths/params mirror the deployed
/// web client (`apps/web/src/lib/api/albums.ts`).
class AlbumsApi {
  AlbumsApi(this._dio);

  final Dio _dio;

  Future<List<Album>> getMine() async {
    final res = await _dio.get<dynamic>('/albums/mine');
    return _toList(res.data);
  }

  Future<List<Album>> getByPerson(String personId) async {
    final res = await _dio.get<dynamic>('/albums/by-person/$personId');
    return _toList(res.data);
  }

  Future<AlbumDetail> getById(String id) async {
    final res = await _dio.get<dynamic>('/albums/$id');
    return AlbumDetail.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Album> create({
    required String title,
    String? description,
    AlbumKind kind = AlbumKind.personal,
    String? subjectPersonId,
    String? coverMediaId,
    MemoryVisibilityScope visibilityScope =
        MemoryVisibilityScope.privateSelf,
    int? visibleMaxDegree,
  }) async {
    final res = await _dio.post<dynamic>(
      '/albums',
      data: <String, dynamic>{
        'title': title,
        if (description != null) 'description': description,
        'kind': kind.wire,
        if (subjectPersonId != null) 'subjectPersonId': subjectPersonId,
        if (coverMediaId != null) 'coverMediaId': coverMediaId,
        'visibilityScope': visibilityScope.wire,
        if (visibleMaxDegree != null) 'visibleMaxDegree': visibleMaxDegree,
      },
    );
    return Album.fromJson(res.data as Map<String, dynamic>);
  }

  Future<AlbumItem> addItem(
    String albumId, {
    required String mediaId,
    String? caption,
    String? takenAt,
    String? takenAtText,
    int? position,
  }) async {
    final res = await _dio.post<dynamic>(
      '/albums/$albumId/items',
      data: <String, dynamic>{
        'mediaId': mediaId,
        if (caption != null) 'caption': caption,
        if (takenAt != null) 'takenAt': takenAt,
        if (takenAtText != null) 'takenAtText': takenAtText,
        if (position != null) 'position': position,
      },
    );
    return AlbumItem.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> deleteItem(String albumId, String itemId) async {
    await _dio.delete<dynamic>('/albums/$albumId/items/$itemId');
  }

  Future<void> deleteAlbum(String id) async {
    await _dio.delete<dynamic>('/albums/$id');
  }

  List<Album> _toList(Object? data) {
    if (data is List<dynamic>) {
      return data
          .whereType<Map<String, dynamic>>()
          .map(Album.fromJson)
          .toList();
    }
    return const <Album>[];
  }
}

final Provider<AlbumsApi> albumsApiProvider =
    Provider<AlbumsApi>((ref) => AlbumsApi(ref.watch(dioProvider)));
