import 'package:freezed_annotation/freezed_annotation.dart';

import 'package:origin_mobile/data/models/enums.dart';

part 'person_name.freezed.dart';
part 'person_name.g.dart';

/// Mirror of `model PersonName` — a person can carry several name variants
/// (civil, traditional, married, …). Only one is `isPrimary` at a time.
@freezed
class PersonName with _$PersonName {
  const factory PersonName({
    required String id,
    required String personId,
    required NameType nameType,
    required String fullName,
    String? firstName,
    String? lastName,
    String? middleNames,
    @Default(false) bool isPrimary,
    DateTime? usedFromDate,
    DateTime? usedUntilDate,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _PersonName;

  factory PersonName.fromJson(Map<String, dynamic> json) =>
      _$PersonNameFromJson(json);
}
