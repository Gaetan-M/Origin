import 'package:freezed_annotation/freezed_annotation.dart';

import 'package:origin_mobile/data/models/enums.dart';

part 'parent_child.freezed.dart';
part 'parent_child.g.dart';

/// Mirror of `model ParentChild` — directional edge between a parent
/// person and a child person.
@freezed
class ParentChild with _$ParentChild {
  const factory ParentChild({
    required String id,
    required String parentId,
    required String childId,
    @Default(ParentRelationshipType.biological)
    ParentRelationshipType relationshipType,
    String? unionId,
    double? confidence,
    String? notes,
    String? createdByAccountId,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? deletedAt,
  }) = _ParentChild;

  factory ParentChild.fromJson(Map<String, dynamic> json) =>
      _$ParentChildFromJson(json);
}
