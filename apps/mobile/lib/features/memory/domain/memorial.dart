import 'package:origin_mobile/features/memory/domain/visibility_scope.dart';

/// Kind of memorial tribute. Mirrors the web `MemorialTributeKind` union.
enum MemorialTributeKind {
  candle,
  message,
  photo,
  video;

  String get wire => switch (this) {
        MemorialTributeKind.candle => 'CANDLE',
        MemorialTributeKind.message => 'MESSAGE',
        MemorialTributeKind.photo => 'PHOTO',
        MemorialTributeKind.video => 'VIDEO',
      };

  static MemorialTributeKind fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'MESSAGE':
        return MemorialTributeKind.message;
      case 'PHOTO':
        return MemorialTributeKind.photo;
      case 'VIDEO':
        return MemorialTributeKind.video;
      case 'CANDLE':
      default:
        return MemorialTributeKind.candle;
    }
  }

  bool get needsMedia =>
      this == MemorialTributeKind.photo || this == MemorialTributeKind.video;
}

/// A single tribute left on a deceased person's memorial wall.
///
/// Plain immutable Dart class mirroring the deployed web client
/// (`apps/web/src/lib/api/memorial.ts`).
class MemorialTribute {
  const MemorialTribute({
    required this.id,
    required this.personId,
    required this.authorAccountId,
    required this.kind,
    required this.visibilityScope,
    required this.createdAt,
    this.authorDisplayName,
    this.message,
    this.mediaId,
  });

  final String id;
  final String personId;
  final String authorAccountId;
  final MemorialTributeKind kind;
  final MemoryVisibilityScope visibilityScope;
  final DateTime createdAt;

  /// Display name of the tribute author, when the API resolves it.
  final String? authorDisplayName;
  final String? message;
  final String? mediaId;

  factory MemorialTribute.fromJson(Map<String, dynamic> json) {
    return MemorialTribute(
      id: json['id'] as String,
      personId:
          json['personId'] as String? ?? json['person_id'] as String? ?? '',
      authorAccountId: json['authorAccountId'] as String? ??
          json['author_account_id'] as String? ??
          '',
      kind: MemorialTributeKind.fromWire(json['kind'] as String?),
      visibilityScope: MemoryVisibilityScope.fromWire(
        json['visibilityScope'] as String? ??
            json['visibility_scope'] as String?,
      ),
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? json['created_at'] ?? '')
                  .toString()) ??
              DateTime.now().toUtc(),
      authorDisplayName: json['authorDisplayName'] as String? ??
          json['author_display_name'] as String?,
      message: json['message'] as String?,
      mediaId:
          json['mediaId'] as String? ?? json['media_id'] as String?,
    );
  }
}

/// Aggregate counters for a person's memorial.
class MemorialSummary {
  const MemorialSummary({
    required this.personId,
    this.candleCount = 0,
    this.tributeCount = 0,
  });

  final String personId;
  final int candleCount;
  final int tributeCount;

  factory MemorialSummary.fromJson(Map<String, dynamic> json) {
    return MemorialSummary(
      personId:
          json['personId'] as String? ?? json['person_id'] as String? ?? '',
      candleCount: (json['candleCount'] as num?)?.toInt() ??
          (json['candle_count'] as num?)?.toInt() ??
          0,
      tributeCount: (json['tributeCount'] as num?)?.toInt() ??
          (json['tribute_count'] as num?)?.toInt() ??
          0,
    );
  }
}
