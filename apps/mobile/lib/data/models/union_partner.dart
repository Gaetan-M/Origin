import 'package:freezed_annotation/freezed_annotation.dart';

part 'union_partner.freezed.dart';
part 'union_partner.g.dart';

/// Mirror of `model UnionPartner` — link table joining a [Union] to a
/// person. Polygamous unions carry multiple rows ranked by [wifeRank].
@freezed
class UnionPartner with _$UnionPartner {
  const factory UnionPartner({
    required String id,
    required String unionId,
    required String personId,
    String? role,
    int? wifeRank,
    DateTime? createdAt,
  }) = _UnionPartner;

  factory UnionPartner.fromJson(Map<String, dynamic> json) =>
      _$UnionPartnerFromJson(json);
}
