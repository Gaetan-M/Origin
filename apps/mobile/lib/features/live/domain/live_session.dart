import 'package:origin_mobile/features/live/domain/live_enums.dart';

/// A scheduled, running or ended live session, as rendered on mobile.
///
/// Plain immutable Dart class (no freezed/codegen) so the feature compiles in
/// isolation during the parallel build. Mirrors the web `LiveSession` shape
/// (GET /live, GET /live/:id).
class LiveSession {
  const LiveSession({
    required this.id,
    required this.hostAccountId,
    required this.title,
    required this.kind,
    required this.visibilityScope,
    required this.roomName,
    required this.status,
    required this.replayPublished,
    required this.createdAt,
    required this.updatedAt,
    this.hostAuthorityId,
    this.hostDisplayName,
    this.description,
    this.visibleMaxDegree,
    this.subjectPersonId,
    this.scheduledAt,
    this.startedAt,
    this.endedAt,
    this.recordingMediaId,
    this.participantCount = 0,
  });

  final String id;
  final String hostAccountId;
  final String? hostAuthorityId;

  /// Display name of the host, when the API resolves it.
  final String? hostDisplayName;

  final String title;
  final String? description;
  final LiveSessionKind kind;
  final LiveVisibilityScope visibilityScope;
  final int? visibleMaxDegree;
  final String? subjectPersonId;
  final String roomName;
  final LiveSessionStatus status;

  final DateTime? scheduledAt;
  final DateTime? startedAt;
  final DateTime? endedAt;

  final String? recordingMediaId;
  final bool replayPublished;

  /// Convenience count the API may resolve; falls back to 0 when absent.
  final int participantCount;

  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isLive => status == LiveSessionStatus.live;
  bool get isScheduled => status == LiveSessionStatus.scheduled;
  bool get isEnded => status == LiveSessionStatus.ended;

  /// Whether an ended session exposes a playable replay.
  bool get hasReplay =>
      isEnded && replayPublished && (recordingMediaId?.isNotEmpty ?? false);

  factory LiveSession.fromJson(Map<String, dynamic> json) {
    return LiveSession(
      id: json['id'] as String,
      hostAccountId: json['hostAccountId'] as String? ??
          json['host_account_id'] as String? ??
          '',
      hostAuthorityId:
          json['hostAuthorityId'] as String? ?? json['host_authority_id'] as String?,
      hostDisplayName: json['hostDisplayName'] as String? ??
          json['host_display_name'] as String?,
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      kind: LiveSessionKind.fromWire(json['kind'] as String?),
      visibilityScope: LiveVisibilityScope.fromWire(
        json['visibilityScope'] as String? ?? json['visibility_scope'] as String?,
      ),
      visibleMaxDegree: (json['visibleMaxDegree'] as num?)?.toInt() ??
          (json['visible_max_degree'] as num?)?.toInt(),
      subjectPersonId:
          json['subjectPersonId'] as String? ?? json['subject_person_id'] as String?,
      roomName: json['roomName'] as String? ?? json['room_name'] as String? ?? '',
      status: LiveSessionStatus.fromWire(json['status'] as String?),
      scheduledAt: _parseDate(json['scheduledAt'] ?? json['scheduled_at']),
      startedAt: _parseDate(json['startedAt'] ?? json['started_at']),
      endedAt: _parseDate(json['endedAt'] ?? json['ended_at']),
      recordingMediaId:
          json['recordingMediaId'] as String? ?? json['recording_media_id'] as String?,
      replayPublished: json['replayPublished'] as bool? ??
          json['replay_published'] as bool? ??
          false,
      participantCount: (json['participantCount'] as num?)?.toInt() ??
          (json['participant_count'] as num?)?.toInt() ??
          0,
      createdAt: _parseDate(json['createdAt'] ?? json['created_at']) ??
          DateTime.now().toUtc(),
      updatedAt: _parseDate(json['updatedAt'] ?? json['updated_at']) ??
          DateTime.now().toUtc(),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'hostAccountId': hostAccountId,
      'hostAuthorityId': hostAuthorityId,
      'hostDisplayName': hostDisplayName,
      'title': title,
      'description': description,
      'kind': kind.wireName,
      'visibilityScope': visibilityScope.wireName,
      'visibleMaxDegree': visibleMaxDegree,
      'subjectPersonId': subjectPersonId,
      'roomName': roomName,
      'status': status.wireName,
      'scheduledAt': scheduledAt?.toIso8601String(),
      'startedAt': startedAt?.toIso8601String(),
      'endedAt': endedAt?.toIso8601String(),
      'recordingMediaId': recordingMediaId,
      'replayPublished': replayPublished,
      'participantCount': participantCount,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  static DateTime? _parseDate(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    return DateTime.tryParse(value.toString());
  }
}

/// Payload for POST /live (schedule a live session).
class CreateLiveSessionInput {
  const CreateLiveSessionInput({
    required this.title,
    required this.kind,
    required this.visibilityScope,
    this.description,
    this.visibleMaxDegree,
    this.subjectPersonId,
    this.scheduledAt,
  });

  final String title;
  final LiveSessionKind kind;
  final LiveVisibilityScope visibilityScope;
  final String? description;
  final int? visibleMaxDegree;
  final String? subjectPersonId;

  /// ISO-8601 instant; null means "start now / unscheduled".
  final DateTime? scheduledAt;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'title': title,
      'kind': kind.wireName,
      'visibilityScope': visibilityScope.wireName,
      if (description != null) 'description': description,
      if (visibleMaxDegree != null) 'visibleMaxDegree': visibleMaxDegree,
      if (subjectPersonId != null) 'subjectPersonId': subjectPersonId,
      'scheduledAt': scheduledAt?.toUtc().toIso8601String(),
    };
  }
}
