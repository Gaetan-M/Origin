// Domain enums for the LIVE feature (Phase 5).
//
// Plain Dart enums with explicit wire mappings (no codegen) so the feature
// compiles in isolation during the parallel build. Wire values mirror the
// backend `LiveSession.status` / `kind` vocabularies and the shared
// `VisibilityScope` used across the platform.

/// Lifecycle status of a live session. Mirrors `LiveSession.status`.
enum LiveSessionStatus {
  scheduled,
  live,
  ended,
  cancelled,
  unknown;

  String get wireName => switch (this) {
        LiveSessionStatus.scheduled => 'SCHEDULED',
        LiveSessionStatus.live => 'LIVE',
        LiveSessionStatus.ended => 'ENDED',
        LiveSessionStatus.cancelled => 'CANCELLED',
        LiveSessionStatus.unknown => 'UNKNOWN',
      };

  static LiveSessionStatus fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'SCHEDULED':
        return LiveSessionStatus.scheduled;
      case 'LIVE':
        return LiveSessionStatus.live;
      case 'ENDED':
        return LiveSessionStatus.ended;
      case 'CANCELLED':
        return LiveSessionStatus.cancelled;
      default:
        return LiveSessionStatus.unknown;
    }
  }
}

/// Kind of a live session. Mirrors `LiveSession.kind`.
enum LiveSessionKind {
  ceremony,
  familyCouncil,
  lesson,
  storytelling,
  masterclass,
  other;

  String get wireName => switch (this) {
        LiveSessionKind.ceremony => 'CEREMONY',
        LiveSessionKind.familyCouncil => 'FAMILY_COUNCIL',
        LiveSessionKind.lesson => 'LESSON',
        LiveSessionKind.storytelling => 'STORYTELLING',
        LiveSessionKind.masterclass => 'MASTERCLASS',
        LiveSessionKind.other => 'OTHER',
      };

  static LiveSessionKind fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'CEREMONY':
        return LiveSessionKind.ceremony;
      case 'FAMILY_COUNCIL':
        return LiveSessionKind.familyCouncil;
      case 'LESSON':
        return LiveSessionKind.lesson;
      case 'STORYTELLING':
        return LiveSessionKind.storytelling;
      case 'MASTERCLASS':
        return LiveSessionKind.masterclass;
      default:
        return LiveSessionKind.other;
    }
  }

  /// Selectable kinds offered in the schedule form (mirrors the web
  /// `LIVE_SESSION_KINDS`).
  static const List<LiveSessionKind> choices = <LiveSessionKind>[
    LiveSessionKind.ceremony,
    LiveSessionKind.familyCouncil,
    LiveSessionKind.lesson,
    LiveSessionKind.storytelling,
    LiveSessionKind.masterclass,
    LiveSessionKind.other,
  ];
}

/// Visibility scope a host may pick when scheduling a live. Mirrors the shared
/// `VisibilityScope` enum; only FAMILY and PUBLIC are offered to hosts (web
/// `LIVE_VISIBILITY_CHOICES`).
enum LiveVisibilityScope {
  privateSelf,
  family,
  public;

  String get wireName => switch (this) {
        LiveVisibilityScope.privateSelf => 'PRIVATE_SELF',
        LiveVisibilityScope.family => 'FAMILY',
        LiveVisibilityScope.public => 'PUBLIC',
      };

  static LiveVisibilityScope fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'PRIVATE_SELF':
        return LiveVisibilityScope.privateSelf;
      case 'PUBLIC':
        return LiveVisibilityScope.public;
      case 'FAMILY':
      default:
        return LiveVisibilityScope.family;
    }
  }

  /// Visibility choices a host may pick (mirrors web `LIVE_VISIBILITY_CHOICES`).
  static const List<LiveVisibilityScope> choices = <LiveVisibilityScope>[
    LiveVisibilityScope.family,
    LiveVisibilityScope.public,
  ];
}

/// Media kind of a replay recording — drives audio vs video playback.
enum LiveReplayMediaKind {
  audio,
  video;

  static LiveReplayMediaKind fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'VIDEO':
        return LiveReplayMediaKind.video;
      case 'AUDIO':
      default:
        return LiveReplayMediaKind.audio;
    }
  }
}
