import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/features/explore/domain/cursor_page.dart';
import 'package:origin_mobile/features/explore/domain/learning_enums.dart';
import 'package:origin_mobile/features/explore/domain/learning_lesson.dart';

/// Thin dio wrapper over the PUBLIC `/learning` endpoints.
///
/// Responses are already unwrapped from the NestJS `{ data, statusCode }`
/// envelope by the shared `_UnwrapInterceptor` (see `dio_client.dart`). Mirrors
/// the web `learning.ts` contract exactly.
class LearningApi {
  LearningApi(this._dio);

  final Dio _dio;

  /// GET /learning/lessons — cursor-paginated PUBLIC list of approved lessons.
  /// Lessons from a verified authority are surfaced first.
  Future<CursorPage<LearningLessonSummary>> getLessons({
    String? cursor,
    int? limit,
    String? languageCode,
    LearningLevel? level,
  }) async {
    final res = await _dio.get<dynamic>(
      '/learning/lessons',
      queryParameters: <String, dynamic>{
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
        if (limit != null) 'limit': limit,
        if (languageCode != null && languageCode.isNotEmpty)
          'languageCode': languageCode,
        if (level != null) 'level': level.wireName,
      },
    );
    return CursorPage.fromResponse<LearningLessonSummary>(
      res.data,
      LearningLessonSummary.fromJson,
    );
  }

  /// GET /learning/lessons/:id — full lesson detail incl. mini-lesson content.
  Future<LearningLessonDetail> getLesson(String id) async {
    final res = await _dio.get<dynamic>('/learning/lessons/$id');
    return LearningLessonDetail.fromJson(res.data as Map<String, dynamic>);
  }

  /// POST /learning/lessons/:id/enroll — enrol the caller. Idempotent: returns
  /// the existing enrollment if already enrolled.
  Future<LessonEnrollment> enroll(String id) async {
    final res = await _dio.post<dynamic>('/learning/lessons/$id/enroll');
    return LessonEnrollment.fromJson(res.data as Map<String, dynamic>);
  }

  /// PATCH /learning/lessons/:id/progress — update the caller's progress
  /// (0–100). The server sets `completedAt` when progress reaches 100.
  Future<LessonEnrollment> updateProgress(String id, int progressPercent) async {
    final res = await _dio.patch<dynamic>(
      '/learning/lessons/$id/progress',
      data: <String, dynamic>{'progressPercent': progressPercent},
    );
    return LessonEnrollment.fromJson(res.data as Map<String, dynamic>);
  }
}

final Provider<LearningApi> learningApiProvider = Provider<LearningApi>(
  (ref) => LearningApi(ref.watch(dioProvider)),
);
