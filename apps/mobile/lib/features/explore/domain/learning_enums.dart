// Domain enums for the LEARNING surface (mini-lessons preserving language &
// culture). Plain Dart enums with explicit wire mappings (no codegen). Wire
// values mirror the backend `LearningLevel` and `ModerationStatus` prisma
// enums (see the web `lib/api/learning.ts` contract this mirrors).

/// Difficulty level facet of a lesson. Mirrors `LearningLevel`.
enum LearningLevel {
  beginner,
  intermediate,
  advanced;

  String get wireName => switch (this) {
        LearningLevel.beginner => 'BEGINNER',
        LearningLevel.intermediate => 'INTERMEDIATE',
        LearningLevel.advanced => 'ADVANCED',
      };

  static LearningLevel fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'INTERMEDIATE':
        return LearningLevel.intermediate;
      case 'ADVANCED':
        return LearningLevel.advanced;
      case 'BEGINNER':
      default:
        return LearningLevel.beginner;
    }
  }

  /// All levels, in the order the filter rail offers them.
  static const List<LearningLevel> all = <LearningLevel>[
    LearningLevel.beginner,
    LearningLevel.intermediate,
    LearningLevel.advanced,
  ];
}

/// Moderation state of a lesson. Mirrors `ModerationStatus`.
enum ModerationStatus {
  pending,
  approved,
  rejected;

  String get wireName => switch (this) {
        ModerationStatus.pending => 'PENDING',
        ModerationStatus.approved => 'APPROVED',
        ModerationStatus.rejected => 'REJECTED',
      };

  static ModerationStatus fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'APPROVED':
        return ModerationStatus.approved;
      case 'REJECTED':
        return ModerationStatus.rejected;
      case 'PENDING':
      default:
        return ModerationStatus.pending;
    }
  }
}
