export enum LifeStatus {
  ALIVE = 'ALIVE',
  DECEASED = 'DECEASED',
  UNKNOWN = 'UNKNOWN',
}

export enum ClaimStatus {
  PENDING = 'PENDING',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  DISPUTED = 'DISPUTED',
}

export enum VerificationLevel {
  UNVERIFIED = 'UNVERIFIED',
  SELF_DECLARED = 'SELF_DECLARED',
  COMMUNITY_VERIFIED = 'COMMUNITY_VERIFIED',
  DOCUMENT_DECLARED = 'DOCUMENT_DECLARED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  ADMIN_VERIFIED = 'ADMIN_VERIFIED',
}

export enum UnionType {
  CUSTOMARY = 'CUSTOMARY',
  CIVIL = 'CIVIL',
  RELIGIOUS = 'RELIGIOUS',
  FREE_UNION = 'FREE_UNION',
  UNKNOWN = 'UNKNOWN',
}

export enum UnionStatus {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  WIDOWED = 'WIDOWED',
  UNKNOWN = 'UNKNOWN',
}

export enum ParentRelationshipType {
  BIOLOGICAL = 'BIOLOGICAL',
  CUSTOMARY_ADOPTIVE = 'CUSTOMARY_ADOPTIVE',
  LEGAL_ADOPTIVE = 'LEGAL_ADOPTIVE',
  PRESUMED = 'PRESUMED',
  STEP = 'STEP',
}

export enum DocumentType {
  CNI_CAMEROUN = 'CNI_CAMEROUN',
  PASSPORT_CAMEROUN = 'PASSPORT_CAMEROUN',
  PASSPORT_FOREIGN = 'PASSPORT_FOREIGN',
  ACTE_NAISSANCE = 'ACTE_NAISSANCE',
  CARTE_CONSULAIRE = 'CARTE_CONSULAIRE',
  PERMIS_CONDUIRE = 'PERMIS_CONDUIRE',
  CARTE_ELECTEUR = 'CARTE_ELECTEUR',
  CARTE_SCOLAIRE = 'CARTE_SCOLAIRE',
  OTHER = 'OTHER',
}

export enum DocumentVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  SELF_DECLARED = 'SELF_DECLARED',
  COMMUNITY_VERIFIED = 'COMMUNITY_VERIFIED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  ADMIN_VERIFIED = 'ADMIN_VERIFIED',
  DISPUTED = 'DISPUTED',
}

export enum NameType {
  CIVIL = 'CIVIL',
  TRADITIONAL = 'TRADITIONAL',
  NICKNAME = 'NICKNAME',
  MARRIED = 'MARRIED',
  RELIGIOUS = 'RELIGIOUS',
  FORMER = 'FORMER',
}

export enum DatePrecision {
  EXACT = 'EXACT',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
  DECADE = 'DECADE',
  APPROXIMATE = 'APPROXIMATE',
  UNKNOWN = 'UNKNOWN',
}

export enum NotificationType {
  INVITATION_RECEIVED = 'INVITATION_RECEIVED',
  CLAIM_REQUEST = 'CLAIM_REQUEST',
  CLAIM_VALIDATED = 'CLAIM_VALIDATED',
  MERGE_PROPOSAL = 'MERGE_PROPOSAL',
  MODIFICATION_SUGGESTED = 'MODIFICATION_SUGGESTED',
  NEW_FAMILY_MEMBER = 'NEW_FAMILY_MEMBER',
  DECEASE_REPORTED = 'DECEASE_REPORTED',
  BIRTHDAY_REMINDER = 'BIRTHDAY_REMINDER',
  MEMORIAL_REMINDER = 'MEMORIAL_REMINDER',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  MATCH_FOUND_FOR_USER = 'MATCH_FOUND_FOR_USER',
  POTENTIAL_MATCH_FOR_INVITER = 'POTENTIAL_MATCH_FOR_INVITER',
  KINSHIP_PROBE_RECEIVED = 'KINSHIP_PROBE_RECEIVED',
  FAMILY_CODE_REDEEMED = 'FAMILY_CODE_REDEEMED',
  OTHER = 'OTHER',
}

/**
 * Visibility scope for every user-generated content entity.
 * PRIVATE_SELF: owner only.
 * FAMILY: visible within a bounded family-graph degree.
 * PUBLIC: public feed.
 * private -> public is opt-in per item; the public world must never leak family-graph edges.
 */
export enum VisibilityScope {
  PRIVATE_SELF = 'PRIVATE_SELF',
  FAMILY = 'FAMILY',
  PUBLIC = 'PUBLIC',
}

export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
  OTHER = 'O',
  UNKNOWN = 'U',
}

export enum OtpChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  VOICE = 'VOICE',
}

export enum AccountRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum AdminActionSeverity {
  INFO = 'INFO',
  NOTICE = 'NOTICE',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

/**
 * Stable ordering for role comparisons. Higher means more powerful.
 * Use isRoleAtLeast() instead of `>` directly to keep call sites clear.
 */
export const ROLE_RANK: Record<AccountRole, number> = {
  [AccountRole.USER]: 0,
  [AccountRole.MODERATOR]: 1,
  [AccountRole.ADMIN]: 2,
  [AccountRole.SUPER_ADMIN]: 3,
};

export function isRoleAtLeast(role: AccountRole, required: AccountRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}
