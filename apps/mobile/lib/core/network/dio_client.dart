import 'package:dio/dio.dart';
import 'package:dio_smart_retry/dio_smart_retry.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:uuid/uuid.dart';

import 'package:origin_mobile/core/config/env.dart';
import 'package:origin_mobile/core/network/api_exception.dart';
import 'package:origin_mobile/core/network/auth_interceptor.dart';
import 'package:origin_mobile/core/network/logging_interceptor.dart';
import 'package:origin_mobile/core/network/refresh_interceptor.dart';
import 'package:origin_mobile/core/storage/secure_storage.dart';

/// Riverpod-managed device id key inside [FlutterSecureStorage]. Persisting
/// this lets the backend correlate sessions / OTP attempts across token
/// rotations.
const String _deviceIdStorageKey = 'origin.device_id';

/// Resolves a stable per-install device id, creating one on first launch.
/// Persisted in secure storage so the value survives tampering and reboots.
final deviceIdProvider = FutureProvider<String>((ref) async {
  final storage = ref.watch(secureStorageProvider);
  final existing = await storage.read(key: _deviceIdStorageKey);
  if (existing != null && existing.isNotEmpty) return existing;
  final id = const Uuid().v4();
  await storage.write(key: _deviceIdStorageKey, value: id);
  return id;
});

/// Provider for the auth-logout signal. Default implementation is a no-op
/// — the auth feature (Agent 5) overrides this provider to wire it to the
/// real `authStateProvider.notifier.logout()`.
final authLogoutSignalProvider = Provider<AuthLogoutSignal>((ref) {
  return () async {};
});

/// Application-wide [Dio] instance used by every `<Feature>Api` service.
///
/// Pipeline order matters:
///   1. `AuthInterceptor`   — attaches Bearer token.
///   2. `RetryInterceptor`  — replays idempotent failures.
///   3. `RefreshInterceptor`— catches 401 and rotates tokens.
///   4. `_UnwrapInterceptor`— flattens the `{ data, statusCode, … }` envelope.
///   5. `LoggingInterceptor`— prints in debug only.
final dioProvider = Provider<Dio>((ref) {
  final tokenStorage = ref.watch(tokenStorageProvider);
  final logoutSignal = ref.watch(authLogoutSignalProvider);
  final deviceIdAsync = ref.watch(deviceIdProvider);

  final headers = <String, dynamic>{
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  // Best-effort: attach the device id header as soon as the value is
  // resolved. First request right after cold start may go without it,
  // which is fine — the backend treats the header as optional context.
  deviceIdAsync.whenData((id) {
    headers['X-Device-Id'] = id;
  });

  final dio = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      headers: headers,
      responseType: ResponseType.json,
      validateStatus: (status) =>
          status != null && status >= 200 && status < 300,
    ),
  );

  // Bare Dio used exclusively by `RefreshInterceptor` to issue the
  // `/auth/refresh` call without going back through the auth/refresh chain.
  final refreshDio = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 20),
      headers: const {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  dio.interceptors.addAll([
    AuthInterceptor(tokenStorage),
    RetryInterceptor(
      dio: dio,
      logPrint: Env.enableLogging ? null : (_) {},
      retries: 3,
      retryDelays: const [
        Duration(milliseconds: 400),
        Duration(seconds: 1),
        Duration(seconds: 3),
      ],
      retryEvaluator: (error, attempt) {
        // Only retry idempotent verbs and transient failures.
        final method = error.requestOptions.method.toUpperCase();
        final isIdempotent =
            method == 'GET' || method == 'HEAD' || method == 'OPTIONS';
        if (!isIdempotent) return false;
        switch (error.type) {
          case DioExceptionType.connectionTimeout:
          case DioExceptionType.receiveTimeout:
          case DioExceptionType.sendTimeout:
          case DioExceptionType.connectionError:
            return true;
          case DioExceptionType.badResponse:
            final status = error.response?.statusCode ?? 0;
            return status == 502 || status == 503 || status == 504;
          case DioExceptionType.cancel:
          case DioExceptionType.badCertificate:
          case DioExceptionType.unknown:
            return false;
        }
      },
    ),
    RefreshInterceptor(
      refreshDio: refreshDio,
      tokenStorage: tokenStorage,
      onLogout: logoutSignal,
    ),
    _UnwrapInterceptor(),
    LoggingInterceptor(),
  ]);

  return dio;
});

/// Strips the NestJS `TransformInterceptor` envelope so callers can treat
/// `response.data` as the actual payload.
///
/// Backend success bodies are `{ data, statusCode, timestamp }`. Anything
/// else (already-flat responses, multipart, etc.) is passed through.
class _UnwrapInterceptor extends Interceptor {
  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    final data = response.data;
    if (data is Map<String, dynamic> &&
        data.containsKey('data') &&
        data.containsKey('statusCode')) {
      response.data = data['data'];
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Promote DioException to ApiException for callers that bubble up
    // through `.catchError` without unwrapping. We still call `next` with
    // the original DioException so other interceptors can handle 401s, etc.
    handler.next(
      DioException(
        requestOptions: err.requestOptions,
        response: err.response,
        type: err.type,
        error: err.error is ApiException
            ? err.error
            : ApiException.fromDioException(err),
        stackTrace: err.stackTrace,
        message: err.message,
      ),
    );
  }
}
