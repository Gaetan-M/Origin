import 'package:freezed_annotation/freezed_annotation.dart';

import 'package:origin_mobile/data/models/parent_child.dart';
import 'package:origin_mobile/data/models/person.dart';
import 'package:origin_mobile/data/models/union.dart';

part 'family_tree.freezed.dart';
part 'family_tree.g.dart';

/// Subgraph centred on a single person — returned by
/// `GET /persons/:id/family-tree?degrees=N`.
@freezed
class FamilyTree with _$FamilyTree {
  const factory FamilyTree({
    required String centerPersonId,
    @Default(2) int degrees,
    @Default(<Person>[]) List<Person> persons,
    @Default(<ParentChild>[]) List<ParentChild> parentChildEdges,
    @Default(<Union>[]) List<Union> unionEdges,
  }) = _FamilyTree;

  factory FamilyTree.fromJson(Map<String, dynamic> json) =>
      _$FamilyTreeFromJson(json);
}
