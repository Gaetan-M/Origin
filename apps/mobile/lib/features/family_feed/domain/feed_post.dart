import 'package:origin_mobile/data/models/enums.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_enums.dart';
import 'package:origin_mobile/features/family_feed/domain/feed_media.dart';

/// A single family-feed entry as rendered on mobile.
///
/// The visibility OWNER of the post is [subjectPersonId] (the person the event
/// is about) — the backend has already applied [VisibilityGuard] /
/// degree-bounded FAMILY filtering before the post reaches us, so the client
/// renders whatever it receives.
///
/// Plain immutable Dart class (no freezed/codegen) so the feature compiles in
/// isolation during the parallel build. Round-trips losslessly to JSON for the
/// Drift-backed offline cache.
class FeedPost {
  const FeedPost({
    required this.id,
    required this.postType,
    required this.authorAccountId,
    required this.createdAt,
    this.lifeEventId,
    this.lifeEventKind,
    this.subjectPersonId,
    this.subjectDisplayName,
    this.subjectPhotoUrl,
    this.subjectLifeStatus,
    this.authorDisplayName,
    this.authorPhotoUrl,
    this.body,
    this.occurredAt,
    this.visibilityScope,
    this.reactionCount = 0,
    this.commentCount = 0,
    this.myReaction,
    this.media = const <FeedMedia>[],
    this.pending = false,
  });

  final String id;
  final FeedPostType postType;
  final String authorAccountId;
  final DateTime createdAt;

  final String? lifeEventId;
  final FeedLifeEventKind? lifeEventKind;

  /// Visibility owner — the person the post is about.
  final String? subjectPersonId;
  final String? subjectDisplayName;
  final String? subjectPhotoUrl;
  final LifeStatus? subjectLifeStatus;

  final String? authorDisplayName;
  final String? authorPhotoUrl;

  /// Free-text body (text/audio-first content).
  final String? body;

  /// When the underlying event happened (may differ from [createdAt]).
  final DateTime? occurredAt;

  /// Visibility scope wire value: PRIVATE_SELF / FAMILY / PUBLIC.
  final String? visibilityScope;

  final int reactionCount;
  final int commentCount;

  /// The current viewer's own reaction, if any.
  final FeedReactionType? myReaction;

  final List<FeedMedia> media;

  /// True when the post originated locally and has not yet been synced.
  final bool pending;

  /// Timestamp used to order the feed (event time first, else creation time).
  DateTime get sortAt => occurredAt ?? createdAt;

  bool get hasHeavyMedia => media.any((m) => m.kind.isHeavy);
  bool get hasAudio => media.any((m) => m.kind == FeedMediaKind.audio);

  FeedPost copyWith({
    int? reactionCount,
    int? commentCount,
    Object? myReaction = _sentinel,
    bool? pending,
  }) {
    return FeedPost(
      id: id,
      postType: postType,
      authorAccountId: authorAccountId,
      createdAt: createdAt,
      lifeEventId: lifeEventId,
      lifeEventKind: lifeEventKind,
      subjectPersonId: subjectPersonId,
      subjectDisplayName: subjectDisplayName,
      subjectPhotoUrl: subjectPhotoUrl,
      subjectLifeStatus: subjectLifeStatus,
      authorDisplayName: authorDisplayName,
      authorPhotoUrl: authorPhotoUrl,
      body: body,
      occurredAt: occurredAt,
      visibilityScope: visibilityScope,
      reactionCount: reactionCount ?? this.reactionCount,
      commentCount: commentCount ?? this.commentCount,
      myReaction: identical(myReaction, _sentinel)
          ? this.myReaction
          : myReaction as FeedReactionType?,
      media: media,
      pending: pending ?? this.pending,
    );
  }

  static const Object _sentinel = Object();

  factory FeedPost.fromJson(Map<String, dynamic> json) {
    final author = json['author'] as Map<String, dynamic>?;
    final subject = json['subject'] as Map<String, dynamic>? ??
        json['subjectPerson'] as Map<String, dynamic>?;
    final rawMedia = (json['media'] as List<dynamic>?) ?? const <dynamic>[];

    return FeedPost(
      id: json['id'] as String,
      postType: FeedPostType.fromWire(
        json['postType'] as String? ?? json['post_type'] as String?,
      ),
      authorAccountId: json['authorAccountId'] as String? ??
          json['author_account_id'] as String? ??
          author?['id'] as String? ??
          '',
      createdAt: _parseDate(json['createdAt'] ?? json['created_at']) ??
          DateTime.now().toUtc(),
      lifeEventId:
          json['lifeEventId'] as String? ?? json['life_event_id'] as String?,
      lifeEventKind: FeedLifeEventKind.fromWire(
        json['lifeEventKind'] as String? ?? json['life_event_kind'] as String?,
      ),
      subjectPersonId: json['subjectPersonId'] as String? ??
          json['subject_person_id'] as String? ??
          subject?['id'] as String?,
      subjectDisplayName: subject?['displayName'] as String? ??
          json['subjectDisplayName'] as String?,
      subjectPhotoUrl: subject?['photoUrl'] as String? ??
          subject?['primaryPhotoUrl'] as String?,
      subjectLifeStatus: _parseLifeStatus(
        subject?['lifeStatus'] as String? ?? json['subjectLifeStatus'] as String?,
      ),
      authorDisplayName:
          author?['displayName'] as String? ?? author?['fullName'] as String?,
      authorPhotoUrl: author?['photoUrl'] as String?,
      body: json['body'] as String?,
      occurredAt: _parseDate(json['occurredAt'] ?? json['occurred_at']),
      visibilityScope: json['visibilityScope'] as String? ??
          json['visibility_scope'] as String?,
      reactionCount: (json['reactionCount'] as num?)?.toInt() ??
          (json['reaction_count'] as num?)?.toInt() ??
          0,
      commentCount: (json['commentCount'] as num?)?.toInt() ??
          (json['comment_count'] as num?)?.toInt() ??
          0,
      myReaction: FeedReactionType.fromWire(
        json['myReaction'] as String? ?? json['my_reaction'] as String?,
      ),
      media: rawMedia
          .whereType<Map<String, dynamic>>()
          .map(FeedMedia.fromJson)
          .toList(),
      pending: json['pending'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'postType': postType.wireName,
      'authorAccountId': authorAccountId,
      'createdAt': createdAt.toIso8601String(),
      'lifeEventId': lifeEventId,
      'lifeEventKind': lifeEventKind?.wireName,
      'subjectPersonId': subjectPersonId,
      'subjectDisplayName': subjectDisplayName,
      'subjectPhotoUrl': subjectPhotoUrl,
      'subjectLifeStatus': subjectLifeStatus?.name.toUpperCase(),
      'authorDisplayName': authorDisplayName,
      'authorPhotoUrl': authorPhotoUrl,
      'body': body,
      'occurredAt': occurredAt?.toIso8601String(),
      'visibilityScope': visibilityScope,
      'reactionCount': reactionCount,
      'commentCount': commentCount,
      'myReaction': myReaction?.wireName,
      'media': media.map((m) => m.toJson()).toList(),
      'pending': pending,
    };
  }

  static DateTime? _parseDate(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    return DateTime.tryParse(value.toString());
  }

  static LifeStatus? _parseLifeStatus(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'ALIVE':
        return LifeStatus.alive;
      case 'DECEASED':
        return LifeStatus.deceased;
      case 'UNKNOWN':
        return LifeStatus.unknown;
      default:
        return null;
    }
  }
}
