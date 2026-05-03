import 'package:freezed_annotation/freezed_annotation.dart';

import 'package:origin_mobile/data/models/enums.dart';

part 'identity_document.freezed.dart';
part 'identity_document.g.dart';

/// Mirror of `model IdentityDocument`.
///
/// `documentNumber` is intentionally absent — the backend only exposes the
/// last-4 digits via the list endpoint and the full plaintext value via
/// `GET /identity-documents/:id/reveal` (owner only). Use [revealedNumber]
/// for the latter.
@freezed
class IdentityDocument with _$IdentityDocument {
  const factory IdentityDocument({
    required String id,
    required String personId,
    required DocumentType documentType,
    String? documentNumberLast4,
    String? issuingAuthority,
    String? issuingPlace,
    DateTime? issueDate,
    DateTime? expiryDate,
    String? scanFileId,
    DateTime? scanExpiresAt,
    @Default(DocumentVerificationStatus.selfDeclared)
    DocumentVerificationStatus verificationStatus,
    String? verifiedByAccountId,
    DateTime? verifiedAt,
    String? addedByAccountId,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? deletedAt,
  }) = _IdentityDocument;

  factory IdentityDocument.fromJson(Map<String, dynamic> json) =>
      _$IdentityDocumentFromJson(json);
}

/// Response of `GET /identity-documents/:id/reveal`.
@freezed
class IdentityDocumentReveal with _$IdentityDocumentReveal {
  const factory IdentityDocumentReveal({
    required String id,
    required String documentNumber,
  }) = _IdentityDocumentReveal;

  factory IdentityDocumentReveal.fromJson(Map<String, dynamic> json) =>
      _$IdentityDocumentRevealFromJson(json);
}
