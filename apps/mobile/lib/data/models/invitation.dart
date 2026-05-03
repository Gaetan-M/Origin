import 'package:freezed_annotation/freezed_annotation.dart';

part 'invitation.freezed.dart';
part 'invitation.g.dart';

/// Mirror of `model InvitationToken`.
///
/// The `token` value is included in the response for the inviter
/// (`GET /invitations/mine`) so that they can re-share the deep-link if
/// the SMS was lost — the backend only redacts it for unrelated callers.
@freezed
class Invitation with _$Invitation {
  const factory Invitation({
    required String id,
    String? token,
    required String inviterAccountId,
    String? targetPersonId,
    String? targetPhoneNumber,
    String? relationshipHint,
    DateTime? usedAt,
    String? usedByAccountId,
    DateTime? expiresAt,
    DateTime? createdAt,
  }) = _Invitation;

  factory Invitation.fromJson(Map<String, dynamic> json) =>
      _$InvitationFromJson(json);
}

/// Public response of `GET /invitations/verify/:token` — minimal context
/// shown before the user logs in.
@freezed
class InvitationVerification with _$InvitationVerification {
  const factory InvitationVerification({
    required bool valid,
    String? inviterDisplayName,
    String? targetPersonDisplayName,
    String? relationshipHint,
    DateTime? expiresAt,
  }) = _InvitationVerification;

  factory InvitationVerification.fromJson(Map<String, dynamic> json) =>
      _$InvitationVerificationFromJson(json);
}
