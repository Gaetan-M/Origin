import 'package:origin_mobile/features/explore/domain/tourism_enums.dart';

/// A single PUBLIC tourism / heritage place.
///
/// Plain immutable Dart class (no freezed/codegen). Carries name/description/
/// region/category/geo plus provenance ([source] + [sourceRef]) and a
/// [verified] flag. NEVER coupled to private person data — public-safe fields
/// only, mirroring the web `TourismPlace` contract.
class TourismPlace {
  const TourismPlace({
    required this.id,
    required this.name,
    required this.category,
    required this.source,
    required this.verified,
    required this.createdAt,
    this.description,
    this.region,
    this.latitude,
    this.longitude,
    this.sourceRef,
    this.mediaUrl,
    this.visibilityScope,
  });

  final String id;
  final String name;
  final String? description;
  final String? region;
  final TourismCategory category;

  /// Geo coordinates are kept as raw strings (mirrors the web contract — they
  /// originate as Postgres `decimal` values serialised to string).
  final String? latitude;
  final String? longitude;

  final TourismSource source;

  /// Provenance citation / URL — shown verbatim so users can trace the source.
  final String? sourceRef;

  final bool verified;

  /// Resolved public media URL, if any media was attached.
  final String? mediaUrl;

  /// Visibility scope wire value (PUBLIC for everything surfaced here).
  final String? visibilityScope;

  final DateTime createdAt;

  bool get hasGeo =>
      (latitude?.isNotEmpty ?? false) && (longitude?.isNotEmpty ?? false);

  factory TourismPlace.fromJson(Map<String, dynamic> json) {
    return TourismPlace(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      region: json['region'] as String?,
      category: TourismCategory.fromWire(json['category'] as String?),
      latitude: _asString(json['latitude']),
      longitude: _asString(json['longitude']),
      source: TourismSource.fromWire(json['source'] as String?),
      sourceRef: json['sourceRef'] as String? ?? json['source_ref'] as String?,
      verified: json['verified'] as bool? ?? false,
      mediaUrl: json['mediaUrl'] as String? ?? json['media_url'] as String?,
      visibilityScope: json['visibilityScope'] as String? ??
          json['visibility_scope'] as String?,
      createdAt: _parseDate(json['createdAt'] ?? json['created_at']) ??
          DateTime.now().toUtc(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'description': description,
      'region': region,
      'category': category.wireName,
      'latitude': latitude,
      'longitude': longitude,
      'source': source.wireName,
      'sourceRef': sourceRef,
      'verified': verified,
      'mediaUrl': mediaUrl,
      'visibilityScope': visibilityScope,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  static String? _asString(Object? value) {
    if (value == null) return null;
    return value.toString();
  }

  static DateTime? _parseDate(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    return DateTime.tryParse(value.toString());
  }
}

/// Input payload for `POST /tourism` (submit a community-sourced place).
class SubmitTourismPlaceInput {
  const SubmitTourismPlaceInput({
    required this.name,
    required this.category,
    required this.source,
    this.description,
    this.region,
    this.latitude,
    this.longitude,
    this.sourceRef,
  });

  final String name;
  final String? description;
  final String? region;
  final TourismCategory category;
  final String? latitude;
  final String? longitude;
  final TourismSource source;
  final String? sourceRef;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'name': name,
      if (description != null) 'description': description,
      if (region != null) 'region': region,
      'category': category.wireName,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      'source': source.wireName,
      if (sourceRef != null) 'sourceRef': sourceRef,
    };
  }
}
