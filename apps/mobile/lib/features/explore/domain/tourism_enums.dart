// Domain enums for the PUBLIC tourism / heritage-places surface.
//
// Plain Dart enums with explicit wire mappings (no codegen) so the feature
// compiles in isolation during the parallel build. Wire values mirror the
// backend `TourismSource` and `TourismCategory` prisma enums (see the web
// `lib/api/tourism.ts` contract this mirrors).

/// Where a place's data was sourced from. Shown verbatim as provenance — an
/// official source is a CITED source, never authority over the family graph.
enum TourismSource {
  ministry,
  ngo,
  community;

  String get wireName => switch (this) {
        TourismSource.ministry => 'MINISTRY',
        TourismSource.ngo => 'NGO',
        TourismSource.community => 'COMMUNITY',
      };

  static TourismSource fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'MINISTRY':
        return TourismSource.ministry;
      case 'NGO':
        return TourismSource.ngo;
      case 'COMMUNITY':
      default:
        return TourismSource.community;
    }
  }

  /// All sources, in the order the submit form offers them.
  static const List<TourismSource> all = <TourismSource>[
    TourismSource.ministry,
    TourismSource.ngo,
    TourismSource.community,
  ];
}

/// Category facet of a tourism / heritage place. Mirrors `TourismCategory`.
enum TourismCategory {
  heritage,
  nature,
  culture,
  museum,
  chefferie,
  religious,
  other;

  String get wireName => switch (this) {
        TourismCategory.heritage => 'HERITAGE',
        TourismCategory.nature => 'NATURE',
        TourismCategory.culture => 'CULTURE',
        TourismCategory.museum => 'MUSEUM',
        TourismCategory.chefferie => 'CHEFFERIE',
        TourismCategory.religious => 'RELIGIOUS',
        TourismCategory.other => 'OTHER',
      };

  static TourismCategory fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'HERITAGE':
        return TourismCategory.heritage;
      case 'NATURE':
        return TourismCategory.nature;
      case 'CULTURE':
        return TourismCategory.culture;
      case 'MUSEUM':
        return TourismCategory.museum;
      case 'CHEFFERIE':
        return TourismCategory.chefferie;
      case 'RELIGIOUS':
        return TourismCategory.religious;
      case 'OTHER':
      default:
        return TourismCategory.other;
    }
  }

  /// All categories, in the order the filter rail / form offer them.
  static const List<TourismCategory> all = <TourismCategory>[
    TourismCategory.heritage,
    TourismCategory.nature,
    TourismCategory.culture,
    TourismCategory.museum,
    TourismCategory.chefferie,
    TourismCategory.religious,
    TourismCategory.other,
  ];
}
