import 'package:freezed_annotation/freezed_annotation.dart';

part 'api_response.freezed.dart';
part 'api_response.g.dart';

/// Wrapper that mirrors the NestJS `TransformInterceptor` envelope:
/// `{ data, statusCode, timestamp }`.
///
/// Errors are emitted by `AllExceptionsFilter` with a different shape
/// (`{ statusCode, message, timestamp, path }`) and are turned into
/// `ApiException` by the interceptor pipeline before reaching this
/// wrapper, so consumers only ever see the success envelope here.
@Freezed(genericArgumentFactories: true)
class ApiResponse<T> with _$ApiResponse<T> {
  const factory ApiResponse({
    required T data,
    @JsonKey(name: 'statusCode') required int statusCode,
    required String timestamp,
  }) = _ApiResponse<T>;

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) fromJsonT,
  ) =>
      _$ApiResponseFromJson<T>(json, fromJsonT);
}

/// Error payload emitted by `AllExceptionsFilter` on the backend.
@freezed
class ApiErrorBody with _$ApiErrorBody {
  const factory ApiErrorBody({
    @JsonKey(name: 'statusCode') required int statusCode,
    @JsonKey(name: 'message') required Object message,
    String? timestamp,
    String? path,
    String? error,
  }) = _ApiErrorBody;

  factory ApiErrorBody.fromJson(Map<String, dynamic> json) =>
      _$ApiErrorBodyFromJson(json);
}
