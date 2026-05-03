import 'package:freezed_annotation/freezed_annotation.dart';

part 'merge_proposal.freezed.dart';
part 'merge_proposal.g.dart';

/// Mirror of `model MergeProposal` — system or user proposal that two
/// fiches describe the same person.
@freezed
class MergeProposal with _$MergeProposal {
  const factory MergeProposal({
    required String id,
    required String personAId,
    required String personBId,
    double? matchScore,
    Map<String, dynamic>? matchingSignals,
    @Default('PENDING') String status,
    String? proposedBy,
    String? proposedByAccountId,
    @Default(<String>[]) List<String> reviewedByAccountIds,
    @Default(<String>[]) List<String> acceptedByAccountIds,
    @Default(<String>[]) List<String> rejectedByAccountIds,
    DateTime? resolvedAt,
    String? resolvedIntoPersonId,
    DateTime? createdAt,
  }) = _MergeProposal;

  factory MergeProposal.fromJson(Map<String, dynamic> json) =>
      _$MergeProposalFromJson(json);
}
