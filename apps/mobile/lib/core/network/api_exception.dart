import 'package:dio/dio.dart';

import 'package:origin_mobile/core/network/api_response.dart';

/// Exception type raised after Dio interceptors have inspected and unwrapped
/// the backend response. Domain code should only ever catch this — never
/// `DioException` directly.
class ApiException implements Exception {
  ApiException({
    required this.statusCode,
    required this.message,
    this.code,
    this.details,
    this.path,
    this.cause,
    this.stackTrace,
  });

  /// HTTP status code (0 when the request never reached a server, e.g. offline).
  final int statusCode;

  /// Server-provided error code (e.g. `'VALIDATION_ERROR'`). May be `null`.
  final String? code;

  /// Best-effort human-readable message extracted from the response. Backend
  /// produces this from `class-validator` constraints or service-thrown
  /// `HttpException` instances.
  final String message;

  /// Raw structured payload — useful for validation errors that come back
  /// as `{ message: [...], error: '...' }`.
  final Object? details;

  /// Request path that triggered the error, when known.
  final String? path;

  /// Original `DioException` (when applicable). Kept for logging / Sentry.
  final Object? cause;

  /// Captured stack trace for debugging.
  final StackTrace? stackTrace;

  /// Build an `ApiException` from a `DioException`.
  ///
  /// Tries hard to surface the most useful message:
  /// 1. Parses the backend's `ApiErrorBody` shape when present.
  /// 2. Falls back to Dio's own message on transport failures.
  factory ApiException.fromDioException(DioException error) {
    final response = error.response;
    final statusCode = response?.statusCode ?? 0;
    final path = response?.requestOptions.path;
    final stack = error.stackTrace;

    if (response?.data is Map<String, dynamic>) {
      final raw = response!.data as Map<String, dynamic>;
      try {
        final body = ApiErrorBody.fromJson(raw);
        final msg = _flattenMessage(body.message);
        return ApiException(
          statusCode: body.statusCode == 0 ? statusCode : body.statusCode,
          message: msg ?? error.message ?? 'Unknown error',
          code: body.error,
          details: body.message is List ? body.message : null,
          path: body.path ?? path,
          cause: error,
          stackTrace: stack,
        );
      } catch (_) {
        final fallback = raw['message'] ?? raw['error'];
        return ApiException(
          statusCode: statusCode,
          message: _flattenMessage(fallback) ??
              error.message ??
              'Unknown error',
          path: path,
          cause: error,
          stackTrace: stack,
        );
      }
    }

    return ApiException(
      statusCode: statusCode,
      message: error.message ?? _defaultMessage(error.type),
      path: path,
      cause: error,
      stackTrace: stack,
    );
  }

  static String? _flattenMessage(Object? raw) {
    if (raw == null) return null;
    if (raw is String) return raw;
    if (raw is List) {
      return raw.map((e) => e?.toString() ?? '').where((s) => s.isNotEmpty).join('\n');
    }
    return raw.toString();
  }

  static String _defaultMessage(DioExceptionType type) {
    switch (type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Network timeout';
      case DioExceptionType.cancel:
        return 'Request cancelled';
      case DioExceptionType.connectionError:
        return 'No connection to the server';
      case DioExceptionType.badCertificate:
        return 'Invalid SSL certificate';
      case DioExceptionType.badResponse:
        return 'Bad response from server';
      case DioExceptionType.unknown:
        return 'Unknown network error';
    }
  }

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isValidation => statusCode == 400 || statusCode == 422;
  bool get isRateLimited => statusCode == 429;
  bool get isServerError => statusCode >= 500;
  bool get isOffline => statusCode == 0;

  @override
  String toString() =>
      'ApiException(status=$statusCode, code=$code, message=$message, path=$path)';
}
