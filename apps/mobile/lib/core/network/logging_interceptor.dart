import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import 'package:origin_mobile/core/config/env.dart';

/// Verbose interceptor used in dev / debug builds.
///
/// Production hosts have `Env.enableLogging == false` so this interceptor
/// short-circuits in release. Sensitive headers (`Authorization`, cookies)
/// are masked even in logs to avoid leaking tokens through `flutter logs`.
class LoggingInterceptor extends Interceptor {
  LoggingInterceptor({Logger? logger})
      : _logger = logger ??
            Logger(
              printer: PrettyPrinter(
                methodCount: 0,
                colors: false,
                printEmojis: false,
                printTime: true,
              ),
            );

  final Logger _logger;

  static const _sensitiveHeaders = <String>{
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
  };

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (Env.enableLogging) {
      _logger.d(
        '→ ${options.method} ${options.uri}\n'
        'headers=${_maskHeaders(options.headers)}\n'
        'data=${_truncate(options.data)}',
      );
    }
    handler.next(options);
  }

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    if (Env.enableLogging) {
      _logger.d(
        '← ${response.statusCode} ${response.requestOptions.uri}\n'
        'data=${_truncate(response.data)}',
      );
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (Env.enableLogging) {
      _logger.w(
        '✗ ${err.response?.statusCode ?? '-'} '
        '${err.requestOptions.method} ${err.requestOptions.uri}\n'
        'type=${err.type}\n'
        'message=${err.message}\n'
        'body=${_truncate(err.response?.data)}',
      );
    }
    handler.next(err);
  }

  Map<String, dynamic> _maskHeaders(Map<String, dynamic> headers) {
    return headers.map((k, v) {
      if (_sensitiveHeaders.contains(k.toLowerCase())) {
        return MapEntry(k, '***');
      }
      return MapEntry(k, v);
    });
  }

  String _truncate(Object? value, {int max = 1000}) {
    if (value == null) return 'null';
    final s = value.toString();
    if (s.length <= max) return s;
    return '${s.substring(0, max)}…(${s.length - max} more)';
  }
}
