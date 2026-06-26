import 'package:dio/dio.dart';

import 'package:origin_mobile/core/storage/secure_storage.dart';

/// Adds `Authorization: Bearer <accessToken>` to every outgoing request when
/// a token is available in [TokenStorage].
///
/// We deliberately skip the Authorization header when the request opts out
/// via `extra['skipAuth'] == true`, which is used for the public
/// `/auth/otp/*` and `/auth/refresh` endpoints.
class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._tokenStorage);

  final TokenStorage _tokenStorage;

  /// Extra-key consumed in [Dio]'s `RequestOptions.extra` to suppress the
  /// header on a per-request basis (used by the auth API itself).
  static const String skipAuthExtraKey = 'skipAuth';

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final skip = options.extra[skipAuthExtraKey] == true;
    if (!skip) {
      final token = await _tokenStorage.getAccessToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }
}
