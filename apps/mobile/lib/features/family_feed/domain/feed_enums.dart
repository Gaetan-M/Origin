// Domain enums for the family feed.
//
// Kept as plain Dart enums with explicit wire mappings (no codegen) so this
// feature compiles in isolation during the parallel build. Wire values mirror
// the backend `FeedPost.post_type`, `LifeEventKind` and the reaction/`visibility`
// vocabularies agreed for Phase 1.

/// High-level kind of a feed post. Mirrors `FeedPost.post_type`.
enum FeedPostType {
  lifeEvent,
  announcement,
  memory,
  text,
  unknown;

  String get wireName => switch (this) {
        FeedPostType.lifeEvent => 'LIFE_EVENT',
        FeedPostType.announcement => 'ANNOUNCEMENT',
        FeedPostType.memory => 'MEMORY',
        FeedPostType.text => 'TEXT',
        FeedPostType.unknown => 'UNKNOWN',
      };

  static FeedPostType fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'LIFE_EVENT':
        return FeedPostType.lifeEvent;
      case 'ANNOUNCEMENT':
        return FeedPostType.announcement;
      case 'MEMORY':
        return FeedPostType.memory;
      case 'TEXT':
        return FeedPostType.text;
      default:
        return FeedPostType.unknown;
    }
  }
}

/// Kind of the underlying life event, when the post is event-backed.
/// Mirrors the backend `LifeEventKind` enum (BIRTH / DEATH / UNION).
enum FeedLifeEventKind {
  birth,
  death,
  union,
  unknown;

  String get wireName => switch (this) {
        FeedLifeEventKind.birth => 'BIRTH',
        FeedLifeEventKind.death => 'DEATH',
        FeedLifeEventKind.union => 'UNION',
        FeedLifeEventKind.unknown => 'UNKNOWN',
      };

  static FeedLifeEventKind fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'BIRTH':
        return FeedLifeEventKind.birth;
      case 'DEATH':
        return FeedLifeEventKind.death;
      case 'UNION':
        return FeedLifeEventKind.union;
      default:
        return FeedLifeEventKind.unknown;
    }
  }
}

/// Reaction vocabulary. Stored as `reaction_type` (String) on the backend so
/// the set can grow without a schema migration.
enum FeedReactionType {
  like,
  love,
  pray,
  sad,
  celebrate;

  String get wireName => switch (this) {
        FeedReactionType.like => 'LIKE',
        FeedReactionType.love => 'LOVE',
        FeedReactionType.pray => 'PRAY',
        FeedReactionType.sad => 'SAD',
        FeedReactionType.celebrate => 'CELEBRATE',
      };

  static FeedReactionType? fromWire(String? value) {
    if (value == null) return null;
    switch (value.toUpperCase()) {
      case 'LIKE':
        return FeedReactionType.like;
      case 'LOVE':
        return FeedReactionType.love;
      case 'PRAY':
        return FeedReactionType.pray;
      case 'SAD':
        return FeedReactionType.sad;
      case 'CELEBRATE':
        return FeedReactionType.celebrate;
      default:
        return null;
    }
  }
}

/// Media kind used to drive the low-data deferral strategy.
enum FeedMediaKind {
  image,
  audio,
  video,
  unknown;

  bool get isHeavy => this == FeedMediaKind.image || this == FeedMediaKind.video;

  static FeedMediaKind fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'IMAGE':
      case 'PHOTO':
        return FeedMediaKind.image;
      case 'AUDIO':
        return FeedMediaKind.audio;
      case 'VIDEO':
        return FeedMediaKind.video;
      default:
        return FeedMediaKind.unknown;
    }
  }
}
