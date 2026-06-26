import 'package:origin_mobile/features/discover/domain/cultural_enums.dart';

/// Public-safe author identity (display name only — never phone/private data).
class CulturalAuthor {
  const CulturalAuthor({required this.accountId, required this.displayName});

  final String accountId;
  final String displayName;

  factory CulturalAuthor.fromJson(Map<String, dynamic> json) {
    return CulturalAuthor(
      accountId: json['accountId'] as String? ??
          json['account_id'] as String? ??
          json['id'] as String? ??
          '',
      displayName: json['displayName'] as String? ??
          json['display_name'] as String? ??
          json['fullName'] as String? ??
          '',
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'accountId': accountId,
        'displayName': displayName,
      };
}

/// Public-safe authority summary shown on a verified-content badge.
class CulturalAuthoritySummary {
  const CulturalAuthoritySummary({
    required this.id,
    required this.kind,
    required this.displayName,
    required this.verified,
    this.region,
    this.ethnicGroup,
  });

  final String id;
  final CulturalAuthorityKind kind;
  final String displayName;
  final bool verified;
  final String? region;
  final String? ethnicGroup;

  factory CulturalAuthoritySummary.fromJson(Map<String, dynamic> json) {
    return CulturalAuthoritySummary(
      id: json['id'] as String? ?? '',
      kind: CulturalAuthorityKind.fromWire(json['kind'] as String?),
      displayName: json['displayName'] as String? ??
          json['display_name'] as String? ??
          '',
      verified: json['verified'] as bool? ?? false,
      region: json['region'] as String?,
      ethnicGroup:
          json['ethnicGroup'] as String? ?? json['ethnic_group'] as String?,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'kind': kind.name,
        'displayName': displayName,
        'verified': verified,
        'region': region,
        'ethnicGroup': ethnicGroup,
      };
}

/// A single PUBLIC cultural-heritage item as rendered on mobile.
///
/// The public payload NEVER carries family-graph edges, relationship degrees,
/// phone numbers, or any private person data — only the cultural content plus
/// public author / authority display info.
///
/// Plain immutable Dart class (no freezed/codegen) so this feature compiles in
/// isolation during the parallel build.
class CulturalContentItem {
  const CulturalContentItem({
    required this.id,
    required this.contentType,
    required this.title,
    required this.author,
    required this.isFromVerifiedAuthority,
    required this.moderationStatus,
    required this.createdAt,
    this.body,
    this.languageCode,
    this.region,
    this.ethnicGroup,
    this.mediaUrl,
    this.authority,
    this.visibilityScope,
  });

  final String id;
  final CulturalContentType contentType;
  final String title;
  final String? body;
  final String? languageCode;
  final String? region;
  final String? ethnicGroup;

  /// Resolved public media URL, if any media was attached.
  final String? mediaUrl;

  final CulturalAuthor author;

  /// Present only when authored under a cultural authority (chefferie/expert).
  final CulturalAuthoritySummary? authority;

  final bool isFromVerifiedAuthority;

  /// Visibility scope wire value (PUBLIC for the discovery feed).
  final String? visibilityScope;

  final ModerationStatus moderationStatus;
  final DateTime createdAt;

  /// True when this item should display the "Vérifié" authority badge.
  bool get isVerified =>
      isFromVerifiedAuthority || (authority?.verified ?? false);

  /// Byline label: prefer the public authority display name when present,
  /// otherwise the contributing account's display name. Never private data.
  String get bylineName =>
      (authority?.displayName.isNotEmpty ?? false)
          ? authority!.displayName
          : author.displayName;

  /// Ordered, non-empty meta facets for chips (language / ethnic group / region).
  List<String> get metaBits => <String?>[languageCode, ethnicGroup, region]
      .where((b) => b != null && b.isNotEmpty)
      .cast<String>()
      .toList();

  factory CulturalContentItem.fromJson(Map<String, dynamic> json) {
    final authorJson = json['author'] as Map<String, dynamic>?;
    final authorityJson = json['authority'] as Map<String, dynamic>?;

    return CulturalContentItem(
      id: json['id'] as String,
      contentType: CulturalContentType.fromWire(
        json['contentType'] as String? ?? json['content_type'] as String?,
      ),
      title: json['title'] as String? ?? '',
      body: json['body'] as String?,
      languageCode:
          json['languageCode'] as String? ?? json['language_code'] as String?,
      region: json['region'] as String?,
      ethnicGroup:
          json['ethnicGroup'] as String? ?? json['ethnic_group'] as String?,
      mediaUrl: json['mediaUrl'] as String? ?? json['media_url'] as String?,
      author: authorJson != null
          ? CulturalAuthor.fromJson(authorJson)
          : const CulturalAuthor(accountId: '', displayName: ''),
      authority: authorityJson != null
          ? CulturalAuthoritySummary.fromJson(authorityJson)
          : null,
      isFromVerifiedAuthority:
          json['isFromVerifiedAuthority'] as bool? ??
              json['is_from_verified_authority'] as bool? ??
              false,
      visibilityScope: json['visibilityScope'] as String? ??
          json['visibility_scope'] as String?,
      moderationStatus: ModerationStatus.fromWire(
        json['moderationStatus'] as String? ??
            json['moderation_status'] as String?,
      ),
      createdAt: DateTime.tryParse(
            (json['createdAt'] ?? json['created_at'] ?? '').toString(),
          ) ??
          DateTime.now().toUtc(),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'contentType': contentType.wireName,
        'title': title,
        'body': body,
        'languageCode': languageCode,
        'region': region,
        'ethnicGroup': ethnicGroup,
        'mediaUrl': mediaUrl,
        'author': author.toJson(),
        'authority': authority?.toJson(),
        'isFromVerifiedAuthority': isFromVerifiedAuthority,
        'visibilityScope': visibilityScope,
        'moderationStatus': moderationStatus.name.toUpperCase(),
        'createdAt': createdAt.toIso8601String(),
      };
}

/// One cursor-paginated page of the PUBLIC discovery feed.
///
/// Mirrors the `/public-feed` response shape `{ items, nextCursor, hasMore }`.
class CulturalFeedPage {
  const CulturalFeedPage({
    required this.items,
    this.nextCursor,
    bool? hasMore,
  }) : _hasMore = hasMore;

  final List<CulturalContentItem> items;
  final String? nextCursor;
  final bool? _hasMore;

  /// Whether more pages remain. Falls back to "a cursor was returned" when the
  /// server omits the explicit flag.
  bool get hasMore => _hasMore ?? (nextCursor != null);

  factory CulturalFeedPage.fromJson(Map<String, dynamic> json) {
    final rawItems = (json['items'] ?? json['data'] ?? const <dynamic>[])
        as List<dynamic>;
    return CulturalFeedPage(
      items: rawItems
          .whereType<Map<String, dynamic>>()
          .map(CulturalContentItem.fromJson)
          .toList(),
      nextCursor:
          json['nextCursor'] as String? ?? json['next_cursor'] as String?,
      hasMore: json['hasMore'] as bool? ?? json['has_more'] as bool?,
    );
  }
}

/// Payload for POST /cultural-content.
class CreateCulturalContentInput {
  const CreateCulturalContentInput({
    required this.contentType,
    required this.title,
    this.body,
    this.languageCode,
    this.region,
    this.ethnicGroup,
  });

  final CulturalContentType contentType;
  final String title;
  final String? body;
  final String? languageCode;
  final String? region;
  final String? ethnicGroup;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'contentType': contentType.wireName,
        'title': title,
        if (body != null) 'body': body,
        if (languageCode != null) 'languageCode': languageCode,
        if (region != null) 'region': region,
        if (ethnicGroup != null) 'ethnicGroup': ethnicGroup,
      };
}
