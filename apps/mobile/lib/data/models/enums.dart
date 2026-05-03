import 'package:json_annotation/json_annotation.dart';

/// Whether the person is currently alive.
///
/// Mirrors the backend `LifeStatus` Postgres enum (SCREAMING_SNAKE).
enum LifeStatus {
  @JsonValue('ALIVE')
  alive,
  @JsonValue('DECEASED')
  deceased,
  @JsonValue('UNKNOWN')
  unknown,
}

/// State machine for a [Claim] (account ↔ person link).
enum ClaimStatus {
  @JsonValue('PENDING')
  pending,
  @JsonValue('PENDING_VERIFICATION')
  pendingVerification,
  @JsonValue('VERIFIED')
  verified,
  @JsonValue('REJECTED')
  rejected,
  @JsonValue('DISPUTED')
  disputed,
}

/// Trust ladder applied to fiches and claims.
enum VerificationLevel {
  @JsonValue('UNVERIFIED')
  unverified,
  @JsonValue('SELF_DECLARED')
  selfDeclared,
  @JsonValue('COMMUNITY_VERIFIED')
  communityVerified,
  @JsonValue('DOCUMENT_DECLARED')
  documentDeclared,
  @JsonValue('DOCUMENT_VERIFIED')
  documentVerified,
  @JsonValue('ADMIN_VERIFIED')
  adminVerified,
}

/// Marriage / partnership type.
enum UnionType {
  @JsonValue('CUSTOMARY')
  customary,
  @JsonValue('CIVIL')
  civil,
  @JsonValue('RELIGIOUS')
  religious,
  @JsonValue('FREE_UNION')
  freeUnion,
  @JsonValue('UNKNOWN')
  unknown,
}

enum UnionStatus {
  @JsonValue('ACTIVE')
  active,
  @JsonValue('ENDED')
  ended,
  @JsonValue('WIDOWED')
  widowed,
  @JsonValue('UNKNOWN')
  unknown,
}

enum ParentRelationshipType {
  @JsonValue('BIOLOGICAL')
  biological,
  @JsonValue('CUSTOMARY_ADOPTIVE')
  customaryAdoptive,
  @JsonValue('LEGAL_ADOPTIVE')
  legalAdoptive,
  @JsonValue('PRESUMED')
  presumed,
  @JsonValue('STEP')
  step,
}

enum DocumentType {
  @JsonValue('CNI_CAMEROUN')
  cniCameroun,
  @JsonValue('PASSPORT_CAMEROUN')
  passportCameroun,
  @JsonValue('PASSPORT_FOREIGN')
  passportForeign,
  @JsonValue('ACTE_NAISSANCE')
  acteNaissance,
  @JsonValue('CARTE_CONSULAIRE')
  carteConsulaire,
  @JsonValue('PERMIS_CONDUIRE')
  permisConduire,
  @JsonValue('CARTE_ELECTEUR')
  carteElecteur,
  @JsonValue('CARTE_SCOLAIRE')
  carteScolaire,
  @JsonValue('OTHER')
  other,
}

enum DocumentVerificationStatus {
  @JsonValue('UNVERIFIED')
  unverified,
  @JsonValue('SELF_DECLARED')
  selfDeclared,
  @JsonValue('COMMUNITY_VERIFIED')
  communityVerified,
  @JsonValue('DOCUMENT_VERIFIED')
  documentVerified,
  @JsonValue('ADMIN_VERIFIED')
  adminVerified,
  @JsonValue('DISPUTED')
  disputed,
}

enum NameType {
  @JsonValue('CIVIL')
  civil,
  @JsonValue('TRADITIONAL')
  traditional,
  @JsonValue('NICKNAME')
  nickname,
  @JsonValue('MARRIED')
  married,
  @JsonValue('RELIGIOUS')
  religious,
  @JsonValue('FORMER')
  former,
}

enum DatePrecision {
  @JsonValue('EXACT')
  exact,
  @JsonValue('MONTH')
  month,
  @JsonValue('YEAR')
  year,
  @JsonValue('DECADE')
  decade,
  @JsonValue('APPROXIMATE')
  approximate,
  @JsonValue('UNKNOWN')
  unknown,
}

enum NotificationType {
  @JsonValue('INVITATION_RECEIVED')
  invitationReceived,
  @JsonValue('CLAIM_REQUEST')
  claimRequest,
  @JsonValue('CLAIM_VALIDATED')
  claimValidated,
  @JsonValue('MERGE_PROPOSAL')
  mergeProposal,
  @JsonValue('MODIFICATION_SUGGESTED')
  modificationSuggested,
  @JsonValue('NEW_FAMILY_MEMBER')
  newFamilyMember,
  @JsonValue('DECEASE_REPORTED')
  deceaseReported,
  @JsonValue('BIRTHDAY_REMINDER')
  birthdayReminder,
  @JsonValue('MEMORIAL_REMINDER')
  memorialReminder,
  @JsonValue('DOCUMENT_VERIFIED')
  documentVerified,
  @JsonValue('MATCH_FOUND_FOR_USER')
  matchFoundForUser,
  @JsonValue('POTENTIAL_MATCH_FOR_INVITER')
  potentialMatchForInviter,
  @JsonValue('KINSHIP_PROBE_RECEIVED')
  kinshipProbeReceived,
  @JsonValue('FAMILY_CODE_REDEEMED')
  familyCodeRedeemed,
  @JsonValue('OTHER')
  other,
}

enum AccountRole {
  @JsonValue('USER')
  user,
  @JsonValue('MODERATOR')
  moderator,
  @JsonValue('ADMIN')
  admin,
  @JsonValue('SUPER_ADMIN')
  superAdmin,
}

/// Channel used to deliver an OTP code.
///
/// Backend accepts `'SMS' | 'WHATSAPP' | 'VOICE'` (see `RequestOtpDto`).
enum OtpChannel {
  @JsonValue('SMS')
  sms,
  @JsonValue('WHATSAPP')
  whatsapp,
  @JsonValue('VOICE')
  voice,
}
