import 'dart:async';

import 'package:dio/dio.dart';

import 'package:origin_mobile/core/network/auth_interceptor.dart';
import 'package:origin_mobile/core/storage/secure_storage.dart';

/// Auth event signal emitted when the refresh flow definitively fails
/// (refresh token missing, expired, or rejected). The auth feature
/// (`Agent 5`) listens to this and forces logout / redirect to the OTP
/// screen.
typedef AuthLogoutSignal = Future<void> Function();

/// Intercepts `401 Unauthorized` responses, refreshes tokens through
/// `POST /auth/refresh`, and replays the original request.
///
/// Concurrent 401s are coalesced through a single in-flight `Completer`
/// so multiple simultaneous failing requests issue at most one refresh.
class RefreshInterceptor extends Interceptor {
  RefreshInterceptor({
    required Dio refreshDio,
    required TokenStorage tokenStorage,
    required AuthLogoutSignal onLogout,
  })  : _refreshDio = refreshDio,
        _tokenStorage = tokenStorage,
        _onLogout = onLogout;

  /// A *separate* Dio instance dedicated to the refresh call. Using the
  /// main Dio would loop forever the moment the refresh itself returns
  /// 401.
  final Dio _refreshDio;

  final TokenStorage _tokenStorage;

  final AuthLogoutSignal _onLogout;

  /// Tracks the in-flight refresh, if any.
  Completer<bool>? _refreshing;

  /// Flag to prevent endless retry loops on the same request.
  static const String _retriedExtraKey = 'refreshInterceptor.retried';

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final response = err.response;
    final isUnauthorized = response?.statusCode == 401;
    final alreadyRetried = err.requestOptions.extra[_retriedExtraKey] == true;
    final skipAuth =
        err.requestOptions.extra[AuthInterceptor.skipAuthExtraKey] == true;

    if (!isUnauthorized || alreadyRetried || skipAuth) {
      return handler.next(err);
    }

    final refreshed = await _refreshTokens();
    if (!refreshed) {
      await _onLogout();
      return handler.next(err);
    }

    try {
      final newToken = await _tokenStorage.readAccessToken();
      final retryOptions = err.requestOptions.copyWith(
        extra: {
          ...err.requestOptions.extra,
          _retriedExtraKey: true,
        },
        headers: {
          ...err.requestOptions.headers,
          if (newToken != null && newToken.isNotEmpty)
            'Authorization': 'Bearer $newToken',
        },
      );

      final retryResponse = await _refreshDio.fetch<dynamic>(retryOptions);
      handler.resolve(retryResponse);
    } on DioException catch (e) {
      handler.next(e);
    } catch (e, s) {
      handler.next(
        DioException(
          requestOptions: err.requestOptions,
          error: e,
          stackTrace: s,
          message: 'Failed to retry after refresh',
        ),
      );
    }
  }

  /// Returns `true` when the access token was successfully refreshed.
  Future<bool> _refreshTokens() async {
    final inflight = _refreshing;
    if (inflight != null) {
      return inflight.future;
    }

    final completer = Completer<bool>();
    _refreshing = completer;

    try {
      final refreshToken = await _tokenStorage.readRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        completer.complete(false);
        return false;
      }

      final response = await _refreshDio.post<dynamic>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
        options: Options(
          extra: {AuthInterceptor.skipAuthExtraKey: true},
          headers: const {'Content-Type': 'application/json'},
        ),
      );

      // Backend wraps responses in TransformInterceptor, but the dio_client
      // response transformer already unwraps `data` for us in the main Dio.
      // The dedicated `_refreshDio` does NOT have the transformer, so we
      // unwrap manually here.
      final body = response.data;
      Map<String, dynamic>? tokens;
      if (body is Map<String, dynamic>) {
        if (body['data'] is Map<String, dynamic>) {
          tokens = body['data'] as Map<String, dynamic>;
        } else if (body.containsKey('accessToken')) {
          tokens = body;
        }
      }

      if (tokens == null) {
        completer.complete(false);
        return false;
      }

      final newAccess = tokens['accessToken'] as String?;
      final newRefresh = tokens['refreshToken'] as String?;
      if (newAccess == null || newAccess.isEmpty) {
        completer.complete(false);
        return false;
      }

      await _tokenStorage.saveTokens(
        accessToken: newAccess,
        refreshToken: newRefresh ?? refreshToken,
      );

      completer.complete(true);
      return true;
    } catch (_) {
      completer.complete(false);
      return false;
    } finally {
      _refreshing = null;
    }
  }
}
