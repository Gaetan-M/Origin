// ignore_for_file: public_member_api_docs

import 'package:flutter/foundation.dart';

/// Local domain model for the family tree feature.
///
/// This mirrors the expected shape of the API response
/// (`GET /persons/:id/family-tree?degrees=N`) and the freezed DTOs that
/// Agent 3 will publish under `package:origin_mobile/data/models/...`.
///
/// We keep the local model decoupled so the visualization layer can be tested
/// in isolation. When Agent 3's DTOs land, they should be converted to these
/// types via [TreeData.fromApi] (TODO when shape is finalized).
///
/// All fields are immutable, all collections are unmodifiable.
@immutable
class TreeData {
  const TreeData({
    required this.centerPersonId,
    required this.degrees,
    required this.persons,
    required this.parentChildEdges,
    required this.unionEdges,
  });

  /// Empty tree — used for skeletons / error states.
  factory TreeData.empty(String centerPersonId) {
    return TreeData(
      centerPersonId: centerPersonId,
      degrees: 0,
      persons: const <TreePerson>[],
      parentChildEdges: const <ParentChildEdge>[],
      unionEdges: const <UnionEdge>[],
    );
  }

  /// Person id at the center of the radial visualization.
  final String centerPersonId;

  /// How many degrees of separation are loaded (1..5).
  final int degrees;

  /// All Persons known to the response (center included).
  final List<TreePerson> persons;

  /// All parent-child relationships among the loaded Persons.
  final List<ParentChildEdge> parentChildEdges;

  /// All marital/union relationships among the loaded Persons.
  final List<UnionEdge> unionEdges;

  /// Convenience: build an indexed lookup `personId -> TreePerson`.
  Map<String, TreePerson> indexById() {
    return <String, TreePerson>{
      for (final TreePerson p in persons) p.id: p,
    };
  }

  /// Returns the center [TreePerson] or null if not found in [persons].
  TreePerson? findCenter() {
    for (final TreePerson p in persons) {
      if (p.id == centerPersonId) return p;
    }
    return null;
  }

  TreeData copyWith({
    String? centerPersonId,
    int? degrees,
    List<TreePerson>? persons,
    List<ParentChildEdge>? parentChildEdges,
    List<UnionEdge>? unionEdges,
  }) {
    return TreeData(
      centerPersonId: centerPersonId ?? this.centerPersonId,
      degrees: degrees ?? this.degrees,
      persons: persons ?? this.persons,
      parentChildEdges: parentChildEdges ?? this.parentChildEdges,
      unionEdges: unionEdges ?? this.unionEdges,
    );
  }
}

/// Mirrors the API enum [LifeStatus] (Agent 3).
enum TreeLifeStatus { alive, deceased, unknown }

/// Mirrors [ParentRelationshipType].
enum TreeParentRelType { biological, customaryAdoptive, legalAdoptive, presumed, step }

/// Mirrors [UnionType].
enum TreeUnionType { customary, civil, religious, freeUnion, unknown }

/// Mirrors [UnionStatus].
enum TreeUnionStatus { active, ended, widowed, unknown }

/// Sex / gender for radial layout heuristics ("paternal grandfather").
enum TreeSex { male, female, unknown }

@immutable
class TreePerson {
  const TreePerson({
    required this.id,
    required this.displayName,
    required this.lifeStatus,
    this.givenName,
    this.familyName,
    this.sex = TreeSex.unknown,
    this.photoUrl,
    this.birthYear,
    this.deathYear,
    this.deceasedAssumed = false,
    this.isClaimedByCurrentAccount = false,
  });

  final String id;
  final String displayName;
  final String? givenName;
  final String? familyName;
  final TreeLifeStatus lifeStatus;
  final TreeSex sex;
  final String? photoUrl;
  final int? birthYear;
  final int? deathYear;

  /// True when the Person was added as a "memory ancestor" without proof of
  /// death — they are assumed deceased and rendered as a stylised silhouette.
  final bool deceasedAssumed;

  /// True when the current account has a verified claim on this Person.
  final bool isClaimedByCurrentAccount;

  /// "Years of life" string used on deceased nodes (`1945-2020` / `1945-?`).
  String? get yearsLabel {
    if (birthYear == null && deathYear == null) return null;
    final String start = birthYear?.toString() ?? '?';
    final String end = deathYear?.toString() ?? '?';
    return '$start-$end';
  }

  /// Returns the current age in years (null when the data is insufficient).
  int? currentAge({DateTime? now}) {
    if (birthYear == null) return null;
    if (lifeStatus == TreeLifeStatus.deceased && deathYear != null) {
      return deathYear! - birthYear!;
    }
    final DateTime today = now ?? DateTime.now();
    return today.year - birthYear!;
  }
}

@immutable
class ParentChildEdge {
  const ParentChildEdge({
    required this.id,
    required this.parentId,
    required this.childId,
    required this.relationshipType,
    this.unionId,
  });

  final String id;
  final String parentId;
  final String childId;
  final TreeParentRelType relationshipType;
  final String? unionId;

  /// True when the relation is anything other than biological — drawn as a
  /// dashed line per SPEC §15.5.
  bool get isAdoptiveOrPresumed =>
      relationshipType != TreeParentRelType.biological;
}

@immutable
class UnionEdge {
  const UnionEdge({
    required this.id,
    required this.partnerIds,
    required this.unionType,
    required this.status,
    this.startYear,
    this.endYear,
  });

  final String id;
  final List<String> partnerIds;
  final TreeUnionType unionType;
  final TreeUnionStatus status;
  final int? startYear;
  final int? endYear;
}
