import 'package:freezed_annotation/freezed_annotation.dart';

part 'family_code.freezed.dart';
part 'family_code.g.dart';

/// Mirror of `model FamilyCode` — short string a family head can share so
/// relatives can self-attach on signup.
@freezed
class FamilyCode with _$FamilyCode {
  const factory FamilyCode({
    required String id,
    required String code,
    required String accountId,
    String? label,
    @Default(50) int maxUses,
    @Default(0) int usedCount,
    DateTime? expiresAt,
    DateTime? revokedAt,
    DateTime? createdAt,
  }) = _FamilyCode;

  factory FamilyCode.fromJson(Map<String, dynamic> json) =>
      _$FamilyCodeFromJson(json);
}
