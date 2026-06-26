import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/config/env.dart';
import 'package:origin_mobile/core/network/dio_client.dart';

/// Media purposes understood by the backend media module for Living Memory.
/// Mirrors the web `LivingMemoryMediaPurpose` union.
enum MemoryMediaPurpose {
  album,
  memorial;

  String get wire => switch (this) {
        MemoryMediaPurpose.album => 'ALBUM_MEDIA',
        MemoryMediaPurpose.memorial => 'MEMORIAL_MEDIA',
      };
}

/// Builds the absolute URL that streams the raw bytes of a media item. Safe to
/// use directly as an image/video source — the endpoint is public. Mirrors the
/// web `getMediaFileUrl` helper (`GET /media/:id/file`).
String memoryMediaUrl(String mediaId) => '${Env.apiBaseUrl}/media/$mediaId/file';

/// Uploads a file via the existing media module's presigned-upload flow, then
/// returns the resulting `media_id` that album items / tributes reference.
///
/// This REUSES the media module — it does not re-implement storage. The three
/// steps mirror the deployed web `uploadMediaFile` helper exactly:
///   1. ask the API for a presigned upload URL + a Media row id
///   2. PUT the raw bytes straight to object storage
///   3. confirm the upload so the Media row is marked usable
class MemoryMediaUploader {
  MemoryMediaUploader(this._dio);

  /// Shared, authenticated dio (envelope-unwrapped) for the API calls.
  final Dio _dio;

  /// Bare dio used only for the presigned PUT — the storage URL is
  /// pre-authorised, so it must NOT carry the app's auth header/envelope.
  final Dio _rawDio = Dio();

  Future<String> upload({
    required Uint8List bytes,
    required String fileName,
    required String mimeType,
    required MemoryMediaPurpose purpose,
  }) async {
    final ticketRes = await _dio.post<dynamic>(
      '/media/upload-url',
      data: <String, dynamic>{
        'fileName': fileName,
        'mimeType': mimeType,
        'purpose': purpose.wire,
      },
    );
    final ticket = ticketRes.data as Map<String, dynamic>;
    final uploadUrl = ticket['uploadUrl'] as String;
    final mediaId = ticket['mediaId'] as String;

    await _rawDio.put<dynamic>(
      uploadUrl,
      data: Stream<List<int>>.fromIterable(<List<int>>[bytes]),
      options: Options(
        headers: <String, dynamic>{
          Headers.contentLengthHeader: bytes.length,
          'Content-Type': mimeType,
        },
      ),
    );

    await _dio.post<dynamic>('/media/$mediaId/confirm');
    return mediaId;
  }
}

final Provider<MemoryMediaUploader> memoryMediaUploaderProvider =
    Provider<MemoryMediaUploader>(
  (ref) => MemoryMediaUploader(ref.watch(dioProvider)),
);

/// Best-effort MIME type from a file name when the picker omits it.
String guessMimeType(String fileName, {bool video = false}) {
  final lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return video ? 'video/mp4' : 'image/jpeg';
}
