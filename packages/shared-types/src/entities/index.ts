import type {
  LifeStatus,
  ClaimStatus,
  VerificationLevel,
  UnionType,
  UnionStatus,
  ParentRelationshipType,
  DocumentType,
  DocumentVerificationStatus,
  NameType,
  DatePrecision,
  NotificationType,
  AccountRole,
  AdminActionSeverity,
} from '../enums/index.js';

export interface Account {
  id: string;
  phoneNumber: string;
  phoneCountryCode: string;
  phoneOperator: string | null;
  pinEnabled: boolean;
  languagePreference: string;
  dataSaverMode: boolean;
  largeTextMode: boolean;
  lastLoginAt: string | null;
  email: string | null;
  whatsappEnabled: boolean;
  isActive: boolean;
  role: AccountRole;
  fullName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAccount extends Account {
  isBanned: boolean;
  bannedReason: string | null;
  bannedAt: string | null;
  bannedByAccountId: string | null;
  roleAssignedAt: string | null;
  roleAssignedByAccountId: string | null;
  lastLoginIp: string | null;
  lastLoginDeviceId: string | null;
  notes: string | null;
  deletedAt: string | null;
}

export interface AdminAuditLog {
  id: string;
  actorAccountId: string;
  actorRole: AccountRole;
  action: string;
  category: string;
  severity: AdminActionSeverity;
  targetEntityType: string | null;
  targetEntityId: string | null;
  targetAccountId: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AdminDashboardKpis {
  accounts: { total: number; active: number; banned: number; deleted: number; new7d: number; new30d: number };
  persons: { total: number; deceased: number; alive: number; orphan: number; new7d: number };
  claims: { pending: number; verified: number; disputed: number };
  moderation: { pendingMerges: number; pendingVerifications: number; pendingDocuments: number };
  contributions: { last24h: number; last7d: number };
}

export interface AdminGrowthPoint {
  date: string;
  accounts: number;
  persons: number;
  contributions: number;
}

export interface Person {
  id: string;
  displayName: string;
  normalizedName: string;
  gender: string | null;
  lifeStatus: LifeStatus;
  deceasedAssumed: boolean;
  birthDate: string | null;
  birthDatePrecision: DatePrecision;
  birthYearApproximate: number | null;
  birthDateText: string | null;
  deceasedDate: string | null;
  deceasedDatePrecision: DatePrecision;
  deceasedYearApproximate: number | null;
  deceasedDateText: string | null;
  birthPlace: string | null;
  birthRegion: string | null;
  birthCountry: string | null;
  deceasedPlace: string | null;
  currentResidencePlace: string | null;
  currentResidenceCountry: string | null;
  ethnicity: string | null;
  villageOrigin: string | null;
  chefferie: string | null;
  biography: string | null;
  occupation: string | null;
  phoneNumber: string | null;
  primaryPhotoId: string | null;
  hasPhoto: boolean;
  verificationLevel: VerificationLevel;
  confidenceScore: number;
  isPublic: boolean;
  privacyLevel: number;
  createdByAccountId: string | null;
  claimedByAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonName {
  id: string;
  personId: string;
  nameType: NameType;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  middleNames: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface Union {
  id: string;
  unionType: UnionType;
  status: UnionStatus;
  startDate: string | null;
  startDatePrecision: DatePrecision;
  startYearApproximate: number | null;
  startDateText: string | null;
  endDate: string | null;
  endReason: string | null;
  place: string | null;
  notes: string | null;
  createdAt: string;
}

export interface UnionPartner {
  id: string;
  unionId: string;
  personId: string;
  role: string | null;
  wifeRank: number | null;
}

export interface ParentChild {
  id: string;
  parentId: string;
  childId: string;
  relationshipType: ParentRelationshipType;
  unionId: string | null;
  confidence: number;
  notes: string | null;
  createdAt: string;
}

export interface Claim {
  id: string;
  accountId: string;
  personId: string;
  status: ClaimStatus;
  verificationLevel: VerificationLevel;
  validationCount: number;
  evidence: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface IdentityDocument {
  id: string;
  personId: string;
  documentType: DocumentType;
  documentNumberLast4: string | null;
  verificationStatus: DocumentVerificationStatus;
  issuingAuthority: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  createdAt: string;
}

export interface Contribution {
  id: string;
  accountId: string;
  entityType: string;
  entityId: string;
  action: string;
  fieldName: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  accountId: string;
  notificationType: NotificationType;
  title: string;
  body: string | null;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface FamilyNeighbor {
  personId: string;
  relationshipLabel: string;
  degree: number;
  path: string[];
  person?: Person;
}

export interface FamilyUnion {
  unionId: string;
  personAId: string;
  personBId: string;
}

export interface FamilyTree {
  center: Person;
  neighbors: FamilyNeighbor[];
  unions: FamilyUnion[];
}
