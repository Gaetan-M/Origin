import 'package:origin_mobile/features/explore/domain/learning_enums.dart';

/// Public-safe author identity for a lesson (display name only — never phone /
/// private data). Mirrors the web `LessonAuthor`.
class LessonAuthor {
  const LessonAuthor({required this.accountId, required this.displayName});

  final String accountId;
  final String displayName;

  factory LessonAuthor.fromJson(Map<String, dynamic> json) {
    return LessonAuthor(
      accountId: json['accountId'] as String? ??
          json['account_id'] as String? ??
          json['id'] as String? ??
          '',
      displayName: json['displayName'] as String? ??
          json['display_name'] as String? ??
          '',
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'accountId': accountId,
        'displayName': displayName,
      };
}

/// Public-safe authority summary shown on a verified-lesson badge.
class LessonAuthoritySummary {
  const LessonAuthoritySummary({
    required this.id,
    required this.displayName,
    required this.verified,
    this.region,
    this.ethnicGroup,
  });

  final String id;
  final String displayName;
  final String? region;
  final String? ethnicGroup;
  final bool verified;

  factory LessonAuthoritySummary.fromJson(Map<String, dynamic> json) {
    return LessonAuthoritySummary(
      id: json['id'] as String? ?? '',
      displayName: json['displayName'] as String? ??
          json['display_name'] as String? ??
          '',
      region: json['region'] as String?,
      ethnicGroup:
          json['ethnicGroup'] as String? ?? json['ethnic_group'] as String?,
      verified: json['verified'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'displayName': displayName,
        'region': region,
        'ethnicGroup': ethnicGroup,
        'verified': verified,
      };
}

/// The caller's enrollment in a lesson. Mirrors the web `LessonEnrollment`.
class LessonEnrollment {
  const LessonEnrollment({
    required this.id,
    required this.lessonId,
    required this.accountId,
    required this.progressPercent,
    this.completedAt,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String lessonId;
  final String accountId;
  final int progressPercent;
  final DateTime? completedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isCompleted => completedAt != null;

  factory LessonEnrollment.fromJson(Map<String, dynamic> json) {
    return LessonEnrollment(
      id: json['id'] as String? ?? '',
      lessonId:
          json['lessonId'] as String? ?? json['lesson_id'] as String? ?? '',
      accountId:
          json['accountId'] as String? ?? json['account_id'] as String? ?? '',
      progressPercent: (json['progressPercent'] as num?)?.toInt() ??
          (json['progress_percent'] as num?)?.toInt() ??
          0,
      completedAt: _parseDate(json['completedAt'] ?? json['completed_at']),
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

/// Lightweight lesson card shape used in the lessons list. Mirrors the web
/// `LearningLessonSummary`. [LearningLessonDetail] extends it with the body.
class LearningLessonSummary {
  const LearningLessonSummary({
    required this.id,
    required this.title,
    required this.level,
    required this.author,
    required this.isFromVerifiedAuthority,
    required this.isTicketed,
    required this.moderationStatus,
    required this.position,
    required this.createdAt,
    this.description,
    this.languageCode,
    this.ethnicGroup,
    this.authority,
    this.mediaUrl,
    this.visibilityScope,
    this.enrollment,
  });

  final String id;
  final String title;
  final String? description;
  final String? languageCode;
  final LearningLevel level;
  final String? ethnicGroup;
  final LessonAuthor author;
  final LessonAuthoritySummary? authority;
  final bool isFromVerifiedAuthority;
  final bool isTicketed;
  final String? mediaUrl;
  final String? visibilityScope;
  final ModerationStatus moderationStatus;
  final int position;
  final DateTime createdAt;

  /// Caller's enrollment, when authenticated and enrolled.
  final LessonEnrollment? enrollment;

  /// True when this lesson carries a trusted-authority badge.
  bool get isVerified =>
      isFromVerifiedAuthority || (authority?.verified ?? false);

  /// Display name to attribute the lesson to (authority preferred).
  String get bylineName => authority?.displayName ?? author.displayName;

  factory LearningLessonSummary.fromJson(Map<String, dynamic> json) {
    return LearningLessonSummary(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      languageCode:
          json['languageCode'] as String? ?? json['language_code'] as String?,
      level: LearningLevel.fromWire(json['level'] as String?),
      ethnicGroup:
          json['ethnicGroup'] as String? ?? json['ethnic_group'] as String?,
      author: _parseAuthor(json['author']),
      authority: json['authority'] is Map<String, dynamic>
          ? LessonAuthoritySummary.fromJson(
              json['authority'] as Map<String, dynamic>)
          : null,
      isFromVerifiedAuthority: json['isFromVerifiedAuthority'] as bool? ??
          json['is_from_verified_authority'] as bool? ??
          false,
      isTicketed:
          json['isTicketed'] as bool? ?? json['is_ticketed'] as bool? ?? false,
      mediaUrl: json['mediaUrl'] as String? ?? json['media_url'] as String?,
      visibilityScope: json['visibilityScope'] as String? ??
          json['visibility_scope'] as String?,
      moderationStatus: ModerationStatus.fromWire(
        json['moderationStatus'] as String? ??
            json['moderation_status'] as String?,
      ),
      position: (json['position'] as num?)?.toInt() ?? 0,
      createdAt: _parseDate(json['createdAt'] ?? json['created_at']) ??
          DateTime.now().toUtc(),
      enrollment: json['enrollment'] is Map<String, dynamic>
          ? LessonEnrollment.fromJson(
              json['enrollment'] as Map<String, dynamic>)
          : null,
    );
  }

  static LessonAuthor _parseAuthor(Object? value) {
    if (value is Map<String, dynamic>) return LessonAuthor.fromJson(value);
    return const LessonAuthor(accountId: '', displayName: '');
  }

  static DateTime? _parseDate(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    return DateTime.tryParse(value.toString());
  }
}

/// Full lesson detail — includes the mini-lesson [content] body. Mirrors the
/// web `LearningLessonDetail`.
class LearningLessonDetail extends LearningLessonSummary {
  const LearningLessonDetail({
    required super.id,
    required super.title,
    required super.level,
    required super.author,
    required super.isFromVerifiedAuthority,
    required super.isTicketed,
    required super.moderationStatus,
    required super.position,
    required super.createdAt,
    super.description,
    super.languageCode,
    super.ethnicGroup,
    super.authority,
    super.mediaUrl,
    super.visibilityScope,
    super.enrollment,
    this.content,
    this.liveSessionId,
  });

  /// The mini-lesson body (plain text).
  final String? content;

  /// Present when the lesson is ticketed and linked to a live session.
  final String? liveSessionId;

  factory LearningLessonDetail.fromJson(Map<String, dynamic> json) {
    final summary = LearningLessonSummary.fromJson(json);
    return LearningLessonDetail(
      id: summary.id,
      title: summary.title,
      level: summary.level,
      author: summary.author,
      isFromVerifiedAuthority: summary.isFromVerifiedAuthority,
      isTicketed: summary.isTicketed,
      moderationStatus: summary.moderationStatus,
      position: summary.position,
      createdAt: summary.createdAt,
      description: summary.description,
      languageCode: summary.languageCode,
      ethnicGroup: summary.ethnicGroup,
      authority: summary.authority,
      mediaUrl: summary.mediaUrl,
      visibilityScope: summary.visibilityScope,
      enrollment: summary.enrollment,
      content: json['content'] as String?,
      liveSessionId: json['liveSessionId'] as String? ??
          json['live_session_id'] as String?,
    );
  }

  /// Returns a copy with [enrollment] replaced (used after enroll / progress).
  LearningLessonDetail withEnrollment(LessonEnrollment? value) {
    return LearningLessonDetail(
      id: id,
      title: title,
      level: level,
      author: author,
      isFromVerifiedAuthority: isFromVerifiedAuthority,
      isTicketed: isTicketed,
      moderationStatus: moderationStatus,
      position: position,
      createdAt: createdAt,
      description: description,
      languageCode: languageCode,
      ethnicGroup: ethnicGroup,
      authority: authority,
      mediaUrl: mediaUrl,
      visibilityScope: visibilityScope,
      enrollment: value,
      content: content,
      liveSessionId: liveSessionId,
    );
  }
}
