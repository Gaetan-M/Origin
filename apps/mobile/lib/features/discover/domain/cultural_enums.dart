// Domain enums for the PUBLIC culture discovery feature.
//
// Plain Dart enums with explicit wire mappings (no codegen) so the feature
// compiles in isolation during the parallel build. Wire values mirror the
// backend prisma enums (`CulturalContentType`, `CulturalAuthorityKind`,
// `ModerationStatus`) exposed by `/public-feed` + `/cultural-content`.

/// Kind of cultural-heritage content. Mirrors prisma enum `CulturalContentType`.
enum CulturalContentType {
  language,
  recipe,
  tale,
  proverb,
  rite,
  custom,
  music,
  other;

  String get wireName => switch (this) {
        CulturalContentType.language => 'LANGUAGE',
        CulturalContentType.recipe => 'RECIPE',
        CulturalContentType.tale => 'TALE',
        CulturalContentType.proverb => 'PROVERB',
        CulturalContentType.rite => 'RITE',
        CulturalContentType.custom => 'CUSTOM',
        CulturalContentType.music => 'MUSIC',
        CulturalContentType.other => 'OTHER',
      };

  static CulturalContentType fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'LANGUAGE':
        return CulturalContentType.language;
      case 'RECIPE':
        return CulturalContentType.recipe;
      case 'TALE':
        return CulturalContentType.tale;
      case 'PROVERB':
        return CulturalContentType.proverb;
      case 'RITE':
        return CulturalContentType.rite;
      case 'CUSTOM':
        return CulturalContentType.custom;
      case 'MUSIC':
        return CulturalContentType.music;
      default:
        return CulturalContentType.other;
    }
  }
}

/// Ordered facet list mirroring the web `CULTURAL_CONTENT_TYPES` constant.
const List<CulturalContentType> kCulturalContentTypes = <CulturalContentType>[
  CulturalContentType.language,
  CulturalContentType.recipe,
  CulturalContentType.tale,
  CulturalContentType.proverb,
  CulturalContentType.rite,
  CulturalContentType.custom,
  CulturalContentType.music,
  CulturalContentType.other,
];

/// Kind of cultural authority. Mirrors prisma enum `CulturalAuthorityKind`.
enum CulturalAuthorityKind {
  chefferie,
  expert,
  institution,
  unknown;

  static CulturalAuthorityKind fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'CHEFFERIE':
        return CulturalAuthorityKind.chefferie;
      case 'EXPERT':
        return CulturalAuthorityKind.expert;
      case 'INSTITUTION':
        return CulturalAuthorityKind.institution;
      default:
        return CulturalAuthorityKind.unknown;
    }
  }
}

/// Moderation lifecycle. Mirrors prisma enum `ModerationStatus`.
enum ModerationStatus {
  pending,
  approved,
  rejected;

  static ModerationStatus fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'APPROVED':
        return ModerationStatus.approved;
      case 'REJECTED':
        return ModerationStatus.rejected;
      default:
        return ModerationStatus.pending;
    }
  }
}
