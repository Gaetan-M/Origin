import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/data/models/media.dart';

class MediaApi {
  MediaApi(this._dio);

  final Dio _dio;

  Future<Map<String, dynamic>> uploadUrl({
    required String fileType,
    required String mimeType,
    required int sizeBytes,
    String? personId,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/media/upload-url',
      data: <String, dynamic>{
        'fileType': fileType,
        'mimeType': mimeType,
        'sizeBytes': sizeBytes,
        if (personId != null) 'personId': personId,
      },
    );
    return res.data ?? <String, dynamic>{};
  }

  Future<Media> uploadMultipart({
    required String filePath,
    required String fileType,
    String? personId,
  }) async {
    final form = FormData.fromMap(<String, dynamic>{
      'file': await MultipartFile.fromFile(filePath),
      'fileType': fileType,
      if (personId != null) 'personId': personId,
    });
    final res = await _dio.post<Map<String, dynamic>>(
      '/media/upload',
      data: form,
    );
    return Media.fromJson(res.data!);
  }

  Future<void> confirm(String id) async {
    await _dio.post<dynamic>('/media/$id/confirm');
  }

  Future<List<Media>> byPerson(String personId) async {
    final res = await _dio.get<List<dynamic>>('/media/by-person/$personId');
    return (res.data ?? <dynamic>[])
        .map((e) => Media.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> delete(String id) async {
    await _dio.delete<dynamic>('/media/$id');
  }
}

final Provider<MediaApi> mediaApiProvider =
    Provider<MediaApi>((ref) => MediaApi(ref.watch(dioProvider)));
