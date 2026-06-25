import 'package:origin_mobile/features/family_feed/domain/feed_enums.dart';

/// A single piece of media attached to a feed post.
///
/// In low-data mode heavy media (image/video) is *not* fetched until the user
/// explicitly opts in — only [thumbUrl] (a tiny preview, if any) and metadata
/// are surfaced. Audio is treated as "light" and is offered first.
class FeedMedia {
  const FeedMedia({
    required this.id,
    required this.kind,
    this.url,
    this.thumbUrl,
    this.mimeType,
    this.durationSeconds,
    this.width,
    this.height,
    this.byteSize,
  });

  final String id;
  final FeedMediaKind kind;

  /// Full-resolution / streamable URL. Loaded lazily in low-data mode.
  final String? url;

  /// Optional lightweight preview (blur/low-res). Safe to show even on low data.
  final String? thumbUrl;
  final String? mimeType;
  final int? durationSeconds;
  final int? width;
  final int? height;
  final int? byteSize;

  factory FeedMedia.fromJson(Map<String, dynamic> json) {
    return FeedMedia(
      id: json['id'] as String? ?? '',
      kind: FeedMediaKind.fromWire(
        json['kind'] as String? ?? json['fileType'] as String?,
      ),
      url: json['url'] as String? ?? json['cdnUrl'] as String?,
      thumbUrl: json['thumbUrl'] as String? ?? json['previewUrl'] as String?,
      mimeType: json['mimeType'] as String?,
      durationSeconds: (json['durationSeconds'] as num?)?.toInt(),
      width: (json['width'] as num?)?.toInt(),
      height: (json['height'] as num?)?.toInt(),
      byteSize: (json['fileSizeBytes'] as num?)?.toInt() ??
          (json['byteSize'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'kind': kind.name.toUpperCase(),
      'url': url,
      'thumbUrl': thumbUrl,
      'mimeType': mimeType,
      'durationSeconds': durationSeconds,
      'width': width,
      'height': height,
      'fileSizeBytes': byteSize,
    };
  }
}
