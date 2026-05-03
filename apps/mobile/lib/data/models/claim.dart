import 'package:freezed_annotation/freezed_annotation.dart';

import 'package:origin_mobile/data/models/enums.dart';

part 'claim.freezed.dart';
part 'claim.g.dart';

/// Mirror of `model Claim` — an account asserting that a [Person] is
/// themselves or a relative they speak for.
@freezed
class Claim with _$Claim {
  const factory Claim({
    required String id,
    required String accountId,
    required String personId,
    @Default(ClaimStatus.pending) ClaimStatus status,
    @Default(VerificationLevel.selfDeclared)
    VerificationLevel verificationLevel,
    @Default(<String>[]) List<String> validatedByAccountIds,
    @Default(0) int validationCount,
    String? disputedByClaimId,
    String? disputeReason,
    String? evidence,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? resolvedAt,
  }) = _Claim;

  factory Claim.fromJson(Map<String, dynamic> json) => _$ClaimFromJson(json);
}
