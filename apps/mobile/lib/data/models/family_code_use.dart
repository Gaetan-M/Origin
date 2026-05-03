import 'package:freezed_annotation/freezed_annotation.dart';

part 'family_code_use.freezed.dart';
part 'family_code_use.g.dart';

/// Mirror of `model FamilyCodeUse` — one row per redemption.
@freezed
class FamilyCodeUse with _$FamilyCodeUse {
  const factory FamilyCodeUse({
    required String id,
    required String familyCodeId,
    required String usedByAccountId,
    DateTime? usedAt,
  }) = _FamilyCodeUse;

  factory FamilyCodeUse.fromJson(Map<String, dynamic> json) =>
      _$FamilyCodeUseFromJson(json);
}
