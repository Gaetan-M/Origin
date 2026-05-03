import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:origin_mobile/features/family_tree/domain/tree_data.dart';

/// Slot of a node on the radial canvas, expressed in polar coordinates.
///
/// `degree` is the concentric ring (0 = center, 1 = parents/spouse/children/
/// siblings, 2 = grand-parents/uncles/.../grand-children, ...).
///
/// `angle` is in radians, with 0 = right (+x), `-π/2` = up (parents),
/// `π/2` = down (children), `π` = left (siblings).
@immutable
class TreeSlot {
  const TreeSlot({
    required this.personId,
    required this.degree,
    required this.angle,
    required this.bucket,
    this.attachedToCenter = false,
  });

  final String personId;
  final int degree;
  final double angle;
  final RadialBucket bucket;

  /// True for first-degree slots that hang directly off the center
  /// (parents/spouses/children/siblings). Used by the painter to know
  /// whether to draw the connector to (0,0).
  final bool attachedToCenter;

  /// Cartesian offset for a given ring radius.
  Offset offsetForRadius(double radius) {
    return Offset(radius * math.cos(angle), radius * math.sin(angle));
  }
}

/// Section of the radial canvas a node belongs to.
///
/// We keep these explicit rather than inferring from the angle so the layout
/// math is robust to angle conflicts (we adjust angle within a section).
enum RadialBucket {
  center,
  parents,
  spouses,
  children,
  siblings,
  grandparents,
  unclesAuntsPaternal,
  unclesAuntsMaternal,
  cousins,
  nephewsNieces,
  grandchildren,
  greatGrandparents,
  ancestorsExtended,
  descendantsExtended,
  collateralExtended,
}

/// Result of running [TreeLayout.compute]. Bundle of slots + edges.
@immutable
class TreeLayoutResult {
  const TreeLayoutResult({
    required this.center,
    required this.slots,
    required this.edges,
    required this.emptySlots,
  });

  final TreeSlot center;
  final List<TreeSlot> slots;
  final List<TreeLayoutEdge> edges;

  /// Suggestive empty placeholders ("Grand-père paternel", ...).
  final List<EmptySlot> emptySlots;

  /// Slot lookup by personId. Center is included.
  TreeSlot? slotFor(String personId) {
    if (personId == center.personId) return center;
    for (final TreeSlot s in slots) {
      if (s.personId == personId) return s;
    }
    return null;
  }

  /// All non-center slots + center, in render order (center last so it
  /// always paints on top).
  Iterable<TreeSlot> renderOrder() sync* {
    yield* slots;
    yield center;
  }
}

/// An edge to draw between two slot positions.
@immutable
class TreeLayoutEdge {
  const TreeLayoutEdge({
    required this.fromPersonId,
    required this.toPersonId,
    required this.style,
  });

  final String fromPersonId;
  final String toPersonId;
  final TreeEdgeStyle style;
}

enum TreeEdgeStyle { parentChildSolid, unionDouble, adoptiveDashed }

/// Suggestive empty placeholder for an obviously missing relative.
@immutable
class EmptySlot {
  const EmptySlot({
    required this.id,
    required this.label,
    required this.degree,
    required this.angle,
    required this.suggestedRelation,
    this.parentPersonId,
  });

  final String id;
  final String label;
  final int degree;
  final double angle;

  /// Hint serialised on `/persons/new?relation=...&parent=...`.
  final SuggestedRelation suggestedRelation;
  final String? parentPersonId;

  Offset offsetForRadius(double radius) {
    return Offset(radius * math.cos(angle), radius * math.sin(angle));
  }
}

/// Hint passed to `/persons/new` for context-aware pre-fills.
enum SuggestedRelation {
  paternalGrandfather,
  paternalGrandmother,
  maternalGrandfather,
  maternalGrandmother,
  father,
  mother,
  spouse,
  child,
  sibling,
}

/// Algorithm that turns a [TreeData] response into a [TreeLayoutResult] of
/// polar coordinates.
///
/// The algorithm is `O(n)` over Persons + edges. We:
///   1. Walk parent-child + union edges from the center to classify Persons
///      into [RadialBucket]s + ring degree.
///   2. Sort each bucket (siblings by birth year, spouses by wife rank
///      heuristic — first encountered = primary).
///   3. Distribute slots across the bucket's angular sector with min spacing.
///   4. Produce edge descriptors for the painter.
///   5. Generate suggestive empty slots when grand-parents are missing.
class TreeLayout {
  const TreeLayout({
    this.minSpacingRadians = math.pi / 18, // 10°
    this.maxRingDegree = 3,
  });

  /// Minimum angular separation between two adjacent nodes in the same ring.
  final double minSpacingRadians;

  /// Highest ring we attempt to place. Anything beyond is collapsed to the
  /// outermost ring's "extended" bucket (kept at degree=3).
  final int maxRingDegree;

  TreeLayoutResult compute(TreeData data) {
    final Map<String, TreePerson> byId = data.indexById();
    final TreePerson? center = data.findCenter();

    if (center == null) {
      return TreeLayoutResult(
        center: TreeSlot(
          personId: data.centerPersonId,
          degree: 0,
          angle: 0,
          bucket: RadialBucket.center,
        ),
        slots: const <TreeSlot>[],
        edges: const <TreeLayoutEdge>[],
        emptySlots: const <EmptySlot>[],
      );
    }

    // --- 1) classify ---------------------------------------------------------
    final _Buckets buckets = _Buckets();
    final _Adjacency adj = _buildAdjacency(data);

    // First-degree relatives.
    final List<String> parents = adj.parentsOf(center.id);
    final List<String> spouses = adj.spousesOf(center.id);
    final List<String> children = adj.childrenOf(center.id);

    // Siblings: anyone else who shares a parent with the center, excluding
    // center itself. Using a set to dedupe.
    final Set<String> siblingSet = <String>{};
    for (final String parentId in parents) {
      for (final String c in adj.childrenOf(parentId)) {
        if (c != center.id) siblingSet.add(c);
      }
    }

    buckets.add(RadialBucket.parents, parents);
    buckets.add(RadialBucket.spouses, spouses);
    buckets.add(RadialBucket.children, children);
    buckets.add(RadialBucket.siblings, siblingSet.toList(growable: false));

    // Second-degree.
    // Group grand-parents by paternal/maternal lineage so we can place them
    // above the right parent.
    final Map<String, List<String>> grandparentsByParent = <String, List<String>>{};
    final List<String> grandparentsAll = <String>[];
    for (final String parentId in parents) {
      final List<String> gps = adj.parentsOf(parentId);
      grandparentsByParent[parentId] = gps;
      grandparentsAll.addAll(gps);
    }
    buckets.add(RadialBucket.grandparents, grandparentsAll);

    // Uncles / aunts: siblings of parents, excluding the parents themselves.
    final List<String> unclesPat = <String>[];
    final List<String> unclesMat = <String>[];
    for (int i = 0; i < parents.length; i++) {
      final String parentId = parents[i];
      final TreePerson? parent = byId[parentId];
      // Heuristic: parent of TreeSex.male = paternal lineage, female = maternal,
      // otherwise fall back to ordering: first parent = paternal.
      final bool paternal = parent?.sex == TreeSex.male ||
          (parent?.sex != TreeSex.female && i == 0);
      for (final String gpId in grandparentsByParent[parentId] ?? const <String>[]) {
        for (final String uncleId in adj.childrenOf(gpId)) {
          if (uncleId == parentId) continue;
          if (parents.contains(uncleId)) continue; // co-parent edge case
          (paternal ? unclesPat : unclesMat).add(uncleId);
        }
      }
    }
    buckets.add(RadialBucket.unclesAuntsPaternal, unclesPat.toSet().toList());
    buckets.add(RadialBucket.unclesAuntsMaternal, unclesMat.toSet().toList());

    // Nephews / nieces : children of siblings.
    final Set<String> nephews = <String>{};
    for (final String sibId in siblingSet) {
      nephews.addAll(adj.childrenOf(sibId));
    }
    buckets.add(RadialBucket.nephewsNieces, nephews.toList(growable: false));

    // Grand-children : children of children.
    final Set<String> grandchildren = <String>{};
    for (final String childId in children) {
      grandchildren.addAll(adj.childrenOf(childId));
    }
    buckets.add(RadialBucket.grandchildren, grandchildren.toList(growable: false));

    // Cousins: children of uncles/aunts.
    final Set<String> cousins = <String>{};
    for (final String uId in <String>[...unclesPat, ...unclesMat]) {
      cousins.addAll(adj.childrenOf(uId));
    }
    buckets.add(RadialBucket.cousins, cousins.toList(growable: false));

    // Third-degree (degree=3).
    final Set<String> greatGrandparents = <String>{};
    for (final String gpId in grandparentsAll) {
      greatGrandparents.addAll(adj.parentsOf(gpId));
    }
    buckets.add(
      RadialBucket.greatGrandparents,
      greatGrandparents.toList(growable: false),
    );

    // --- 2) sort each bucket -------------------------------------------------
    int byBirthYearAsc(String a, String b) {
      final int? ya = byId[a]?.birthYear;
      final int? yb = byId[b]?.birthYear;
      if (ya == null && yb == null) return a.compareTo(b);
      if (ya == null) return 1;
      if (yb == null) return -1;
      return ya.compareTo(yb);
    }

    buckets.sortAll(byBirthYearAsc);

    // --- 3) distribute angles ------------------------------------------------
    final List<TreeSlot> slots = <TreeSlot>[];

    // Parents : top sector centered on -π/2, span ±60°.
    _distribute(
      personIds: buckets.get(RadialBucket.parents),
      bucket: RadialBucket.parents,
      degree: 1,
      anchorAngle: -math.pi / 2,
      maxHalfSpan: math.pi / 3,
      out: slots,
    );

    // Spouses : right sector centered on 0, span ±35° (handles polygamy).
    _distribute(
      personIds: buckets.get(RadialBucket.spouses),
      bucket: RadialBucket.spouses,
      degree: 1,
      anchorAngle: 0,
      maxHalfSpan: math.pi / 5,
      out: slots,
    );

    // Children : bottom sector centered on π/2, span ±60°.
    _distribute(
      personIds: buckets.get(RadialBucket.children),
      bucket: RadialBucket.children,
      degree: 1,
      anchorAngle: math.pi / 2,
      maxHalfSpan: math.pi / 3,
      out: slots,
    );

    // Siblings : left sector centered on π, span ±50°.
    _distribute(
      personIds: buckets.get(RadialBucket.siblings),
      bucket: RadialBucket.siblings,
      degree: 1,
      anchorAngle: math.pi,
      maxHalfSpan: math.pi / 3.6,
      out: slots,
    );

    // Grand-parents : split paternal/maternal above each parent slot.
    final List<TreeSlot> parentSlots = slots
        .where((TreeSlot s) => s.bucket == RadialBucket.parents)
        .toList(growable: false);
    final List<EmptySlot> emptySlots = <EmptySlot>[];
    if (parentSlots.isEmpty) {
      // No parents loaded — stub two empty placeholders.
      emptySlots
        ..add(const EmptySlot(
          id: 'empty-father',
          label: 'Papa',
          degree: 1,
          angle: -math.pi / 2 - 0.25,
          suggestedRelation: SuggestedRelation.father,
        ))
        ..add(const EmptySlot(
          id: 'empty-mother',
          label: 'Maman',
          degree: 1,
          angle: -math.pi / 2 + 0.25,
          suggestedRelation: SuggestedRelation.mother,
        ));
    } else {
      // Distribute grand-parents above the parent slot they descend from.
      for (final TreeSlot pSlot in parentSlots) {
        final String parentId = pSlot.personId;
        final List<String> gps = grandparentsByParent[parentId] ?? const <String>[];
        if (gps.isNotEmpty) {
          _distribute(
            personIds: gps,
            bucket: RadialBucket.grandparents,
            degree: 2,
            anchorAngle: pSlot.angle,
            maxHalfSpan: math.pi / 8,
            out: slots,
          );
        } else {
          // Suggestive empty slots — paternal vs maternal heuristic.
          final TreePerson? parent = byId[parentId];
          final bool paternal = parent?.sex == TreeSex.male ||
              (parent?.sex != TreeSex.female &&
                  parents.indexOf(parentId) == 0);
          emptySlots.addAll(<EmptySlot>[
            EmptySlot(
              id: 'empty-gp-$parentId-1',
              label: paternal ? 'Grand-père paternel' : 'Grand-père maternel',
              degree: 2,
              angle: pSlot.angle - 0.2,
              parentPersonId: parentId,
              suggestedRelation: paternal
                  ? SuggestedRelation.paternalGrandfather
                  : SuggestedRelation.maternalGrandfather,
            ),
            EmptySlot(
              id: 'empty-gp-$parentId-2',
              label: paternal ? 'Grand-mère paternelle' : 'Grand-mère maternelle',
              degree: 2,
              angle: pSlot.angle + 0.2,
              parentPersonId: parentId,
              suggestedRelation: paternal
                  ? SuggestedRelation.paternalGrandmother
                  : SuggestedRelation.maternalGrandmother,
            ),
          ]);
        }
      }
    }

    // Uncles/aunts : extend the parents' sector outward on each side.
    _distribute(
      personIds: buckets.get(RadialBucket.unclesAuntsPaternal),
      bucket: RadialBucket.unclesAuntsPaternal,
      degree: 2,
      anchorAngle: -math.pi / 2 - math.pi / 3.5,
      maxHalfSpan: math.pi / 6,
      out: slots,
    );
    _distribute(
      personIds: buckets.get(RadialBucket.unclesAuntsMaternal),
      bucket: RadialBucket.unclesAuntsMaternal,
      degree: 2,
      anchorAngle: -math.pi / 2 + math.pi / 3.5,
      maxHalfSpan: math.pi / 6,
      out: slots,
    );

    // Nephews/nieces : just outside the siblings sector.
    _distribute(
      personIds: buckets.get(RadialBucket.nephewsNieces),
      bucket: RadialBucket.nephewsNieces,
      degree: 2,
      anchorAngle: math.pi - 0.4,
      maxHalfSpan: math.pi / 5,
      out: slots,
    );

    // Grand-children : bottom outer sector.
    _distribute(
      personIds: buckets.get(RadialBucket.grandchildren),
      bucket: RadialBucket.grandchildren,
      degree: 2,
      anchorAngle: math.pi / 2,
      maxHalfSpan: math.pi / 3,
      out: slots,
    );

    // Cousins : same vertical band as uncles, outer ring (degree 3).
    _distribute(
      personIds: buckets.get(RadialBucket.cousins),
      bucket: RadialBucket.cousins,
      degree: 3,
      anchorAngle: -math.pi / 2 - math.pi / 2.5,
      maxHalfSpan: math.pi / 3,
      out: slots,
    );

    // Great grand-parents : outermost top sector.
    _distribute(
      personIds: buckets.get(RadialBucket.greatGrandparents),
      bucket: RadialBucket.greatGrandparents,
      degree: 3,
      anchorAngle: -math.pi / 2,
      maxHalfSpan: math.pi / 2.5,
      out: slots,
    );

    // --- 4) edges ------------------------------------------------------------
    final List<TreeLayoutEdge> edges = <TreeLayoutEdge>[];
    final Set<String> placedIds = <String>{
      data.centerPersonId,
      ...slots.map((TreeSlot s) => s.personId),
    };

    for (final ParentChildEdge e in data.parentChildEdges) {
      if (!placedIds.contains(e.parentId) || !placedIds.contains(e.childId)) {
        continue;
      }
      edges.add(TreeLayoutEdge(
        fromPersonId: e.parentId,
        toPersonId: e.childId,
        style: e.isAdoptiveOrPresumed
            ? TreeEdgeStyle.adoptiveDashed
            : TreeEdgeStyle.parentChildSolid,
      ));
    }
    for (final UnionEdge u in data.unionEdges) {
      if (u.partnerIds.length < 2) continue;
      // Connect each pair of partners (small union → quadratic acceptable).
      for (int i = 0; i < u.partnerIds.length; i++) {
        for (int j = i + 1; j < u.partnerIds.length; j++) {
          final String a = u.partnerIds[i];
          final String b = u.partnerIds[j];
          if (placedIds.contains(a) && placedIds.contains(b)) {
            edges.add(TreeLayoutEdge(
              fromPersonId: a,
              toPersonId: b,
              style: TreeEdgeStyle.unionDouble,
            ));
          }
        }
      }
    }

    return TreeLayoutResult(
      center: TreeSlot(
        personId: center.id,
        degree: 0,
        angle: 0,
        bucket: RadialBucket.center,
      ),
      slots: List<TreeSlot>.unmodifiable(slots),
      edges: List<TreeLayoutEdge>.unmodifiable(edges),
      emptySlots: List<EmptySlot>.unmodifiable(emptySlots),
    );
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  void _distribute({
    required List<String> personIds,
    required RadialBucket bucket,
    required int degree,
    required double anchorAngle,
    required double maxHalfSpan,
    required List<TreeSlot> out,
  }) {
    if (personIds.isEmpty) return;
    final int clampedDegree = math.min(degree, maxRingDegree);
    if (personIds.length == 1) {
      out.add(TreeSlot(
        personId: personIds.first,
        degree: clampedDegree,
        angle: anchorAngle,
        bucket: bucket,
        attachedToCenter: degree == 1,
      ));
      return;
    }

    // Spacing budget: prefer minSpacing but compress to fit if needed.
    final double availableSpan = maxHalfSpan * 2;
    final double idealSpacing = minSpacingRadians;
    final double requiredSpan = idealSpacing * (personIds.length - 1);
    final double actualSpacing = requiredSpan <= availableSpan
        ? idealSpacing
        : availableSpan / (personIds.length - 1);

    final double startAngle =
        anchorAngle - actualSpacing * (personIds.length - 1) / 2;

    for (int i = 0; i < personIds.length; i++) {
      out.add(TreeSlot(
        personId: personIds[i],
        degree: clampedDegree,
        angle: startAngle + actualSpacing * i,
        bucket: bucket,
        attachedToCenter: degree == 1,
      ));
    }
  }
}

// -----------------------------------------------------------------------------
// Adjacency helpers
// -----------------------------------------------------------------------------

class _Adjacency {
  _Adjacency()
      : _parents = <String, List<String>>{},
        _children = <String, List<String>>{},
        _spouses = <String, List<String>>{};

  final Map<String, List<String>> _parents;
  final Map<String, List<String>> _children;
  final Map<String, List<String>> _spouses;

  void addParentChild(String parentId, String childId) {
    _children.putIfAbsent(parentId, () => <String>[]).add(childId);
    _parents.putIfAbsent(childId, () => <String>[]).add(parentId);
  }

  void addSpouse(String a, String b) {
    _spouses.putIfAbsent(a, () => <String>[]).add(b);
    _spouses.putIfAbsent(b, () => <String>[]).add(a);
  }

  List<String> parentsOf(String id) => _parents[id] ?? const <String>[];

  List<String> childrenOf(String id) => _children[id] ?? const <String>[];

  List<String> spousesOf(String id) => _spouses[id] ?? const <String>[];
}

_Adjacency _buildAdjacency(TreeData data) {
  final _Adjacency adj = _Adjacency();
  for (final ParentChildEdge e in data.parentChildEdges) {
    adj.addParentChild(e.parentId, e.childId);
  }
  for (final UnionEdge u in data.unionEdges) {
    final List<String> ids = u.partnerIds;
    for (int i = 0; i < ids.length; i++) {
      for (int j = i + 1; j < ids.length; j++) {
        adj.addSpouse(ids[i], ids[j]);
      }
    }
  }
  return adj;
}

class _Buckets {
  final Map<RadialBucket, List<String>> _data = <RadialBucket, List<String>>{};

  void add(RadialBucket bucket, List<String> ids) {
    if (ids.isEmpty) return;
    final List<String> existing = _data.putIfAbsent(bucket, () => <String>[]);
    for (final String id in ids) {
      if (!existing.contains(id)) existing.add(id);
    }
  }

  List<String> get(RadialBucket bucket) =>
      _data[bucket] ?? const <String>[];

  void sortAll(int Function(String, String) compare) {
    for (final List<String> list in _data.values) {
      list.sort(compare);
    }
  }
}
