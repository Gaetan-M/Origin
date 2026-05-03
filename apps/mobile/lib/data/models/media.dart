import 'package:freezed_annotation/freezed_annotation.dart';

part 'media.freezed.dart';
part 'media.g.dart';

/// Mirror of `model Media` plus the convenience fields the backend adds
/// when serving media (`url`, `privateUrl`, etc.).
@freezed
class Media with _$Media {
  const factory Media({
    required String id,
    required String fileType,
    String? mimeType,
    int? fileSizeBytes,
    String? s3Bucket,
    String? s3Key,
    String? cdnUrl,
    @Default(false) bool isEncrypted,
    String? encryptionKeyId,
    int? width,
    int? height,
    int? durationSeconds,
    String? personId,
    int? photoYear,
    String? uploadedByAccountId,
    DateTime? createdAt,
    DateTime? expiresAt,
    DateTime? deletedAt,

    /// Public streaming URL — populated by `GET /media/:id` and friends.
    String? url,
  }) = _Media;

  factory Media.fromJson(Map<String, dynamic> json) => _$MediaFromJson(json);
}

/// Response from `POST /media/upload-url`.
@freezed
class MediaUploadUrl with _$MediaUploadUrl {
  const factory MediaUploadUrl({
    required String uploadUrl,
    required String mediaId,
    Map<String, String>? headers,
    DateTime? expiresAt,
  }) = _MediaUploadUrl;

  factory MediaUploadUrl.fromJson(Map<String, dynamic> json) =>
      _$MediaUploadUrlFromJson(json);
}

/// Response from `GET /media/:id/private`.
@freezed
class MediaPrivateUrl with _$MediaPrivateUrl {
  const factory MediaPrivateUrl({
    required String url,
    DateTime? expiresAt,
  }) = _MediaPrivateUrl;

  factory MediaPrivateUrl.fromJson(Map<String, dynamic> json) =>
      _$MediaPrivateUrlFromJson(json);
}
