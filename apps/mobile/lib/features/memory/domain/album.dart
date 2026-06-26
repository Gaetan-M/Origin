import 'package:origin_mobile/features/memory/domain/visibility_scope.dart';

/// High-level kind of an album. Mirrors the web `AlbumKind` union.
enum AlbumKind {
  personal,
  family,
  event;

  String get wire => switch (this) {
        AlbumKind.personal => 'PERSONAL',
        AlbumKind.family => 'FAMILY',
        AlbumKind.event => 'EVENT',
      };

  static AlbumKind fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'FAMILY':
        return AlbumKind.family;
      case 'EVENT':
        return AlbumKind.event;
      case 'PERSONAL':
      default:
        return AlbumKind.personal;
    }
  }
}

/// A photo album — a curated, chronological window onto a person/family/event.
///
/// Plain immutable Dart class (no freezed/codegen) so the feature compiles in
/// isolation during the parallel build. Field names/shapes mirror the deployed
/// web client (`apps/web/src/lib/api/albums.ts`), which is the contract source
/// of truth.
class Album {
  const Album({
    required this.id,
    required this.title,
    required this.kind,
    required this.ownerAccountId,
    required this.visibilityScope,
    this.subjectPersonId,
    this.subjectPersonName,
    this.description,
    this.coverMediaId,
    this.visibleMaxDegree,
    this.itemCount = 0,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String title;
  final AlbumKind kind;
  final String ownerAccountId;
  final MemoryVisibilityScope visibilityScope;

  final String? subjectPersonId;
  final String? subjectPersonName;
  final String? description;
  final String? coverMediaId;
  final int? visibleMaxDegree;
  final int itemCount;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory Album.fromJson(Map<String, dynamic> json) {
    return Album(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      kind: AlbumKind.fromWire(json['kind'] as String?),
      ownerAccountId: json['ownerAccountId'] as String? ??
          json['owner_account_id'] as String? ??
          '',
      visibilityScope: MemoryVisibilityScope.fromWire(
        json['visibilityScope'] as String? ??
            json['visibility_scope'] as String?,
      ),
      subjectPersonId: json['subjectPersonId'] as String? ??
          json['subject_person_id'] as String?,
      subjectPersonName: json['subjectPersonName'] as String? ??
          json['subject_person_name'] as String?,
      description: json['description'] as String?,
      coverMediaId:
          json['coverMediaId'] as String? ?? json['cover_media_id'] as String?,
      visibleMaxDegree: (json['visibleMaxDegree'] as num?)?.toInt() ??
          (json['visible_max_degree'] as num?)?.toInt(),
      itemCount: (json['itemCount'] as num?)?.toInt() ??
          (json['item_count'] as num?)?.toInt() ??
          0,
      createdAt: _parseDate(json['createdAt'] ?? json['created_at']),
      updatedAt: _parseDate(json['updatedAt'] ?? json['updated_at']),
    );
  }

  static DateTime? _parseDate(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    return DateTime.tryParse(value.toString());
  }
}

/// A single item (photo) inside an album.
class AlbumItem {
  const AlbumItem({
    required this.id,
    required this.albumId,
    required this.mediaId,
    this.caption,
    this.takenAt,
    this.takenAtText,
    this.position = 0,
    this.createdAt,
  });

  final String id;
  final String albumId;
  final String mediaId;
  final String? caption;

  /// ISO date (yyyy-mm-dd) the media was captured, when known.
  final String? takenAt;

  /// Free-text fuzzy date, e.g. "Été 1998", when an exact date is unknown.
  final String? takenAtText;
  final int position;
  final DateTime? createdAt;

  factory AlbumItem.fromJson(Map<String, dynamic> json) {
    return AlbumItem(
      id: json['id'] as String,
      albumId:
          json['albumId'] as String? ?? json['album_id'] as String? ?? '',
      mediaId:
          json['mediaId'] as String? ?? json['media_id'] as String? ?? '',
      caption: json['caption'] as String?,
      takenAt: json['takenAt'] as String? ?? json['taken_at'] as String?,
      takenAtText:
          json['takenAtText'] as String? ?? json['taken_at_text'] as String?,
      position: (json['position'] as num?)?.toInt() ?? 0,
      createdAt: Album._parseDate(json['createdAt'] ?? json['created_at']),
    );
  }
}

/// An album with its loaded items.
class AlbumDetail {
  const AlbumDetail({required this.album, required this.items});

  final Album album;
  final List<AlbumItem> items;

  factory AlbumDetail.fromJson(Map<String, dynamic> json) {
    final rawItems = (json['items'] as List<dynamic>?) ?? const <dynamic>[];
    return AlbumDetail(
      album: Album.fromJson(json),
      items: rawItems
          .whereType<Map<String, dynamic>>()
          .map(AlbumItem.fromJson)
          .toList(),
    );
  }
}
