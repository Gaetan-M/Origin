import { z } from 'zod';
import {
  LifeStatus,
  DatePrecision,
  NameType,
  ParentRelationshipType,
  UnionType,
  UnionStatus,
  DocumentType,
  OtpChannel,
  Gender,
} from '../enums/index.js';

// ============================================
// Auth DTOs
// ============================================

export const RequestOtpSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be in E.164 format (e.g. +237690000000, +33612345678)'),
  channel: z.nativeEnum(OtpChannel).optional().default(OtpChannel.SMS),
});
export type RequestOtpDto = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be in E.164 format (e.g. +237690000000, +33612345678)'),
  code: z.string().regex(/^[0-9]{6}$/, 'OTP code must be 6 digits'),
});
export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

// ============================================
// Person DTOs
// ============================================

export const CreatePersonSchema = z.object({
  displayName: z.string().min(1).max(255),
  gender: z.nativeEnum(Gender).optional(),
  lifeStatus: z.nativeEnum(LifeStatus),
  deceasedAssumed: z.boolean().optional().default(false),
  birthDate: z.string().optional(),
  birthDatePrecision: z.nativeEnum(DatePrecision).optional().default(DatePrecision.UNKNOWN),
  birthYearApproximate: z.number().int().min(1800).max(2100).optional(),
  birthDateText: z.string().max(100).optional(),
  deceasedDate: z.string().optional(),
  deceasedDatePrecision: z.nativeEnum(DatePrecision).optional().default(DatePrecision.UNKNOWN),
  deceasedYearApproximate: z.number().int().min(1800).max(2100).optional(),
  deceasedDateText: z.string().max(100).optional(),
  birthPlace: z.string().max(255).optional(),
  birthRegion: z.string().max(100).optional(),
  birthCountry: z.string().max(100).optional().default('Cameroun'),
  deceasedPlace: z.string().max(255).optional(),
  currentResidencePlace: z.string().max(255).optional(),
  currentResidenceCountry: z.string().max(100).optional(),
  ethnicity: z.string().max(100).optional(),
  villageOrigin: z.string().max(255).optional(),
  chefferie: z.string().max(255).optional(),
  biography: z.string().max(2000).optional(),
  occupation: z.string().max(255).optional(),
  phoneNumber: z.string().max(20).optional(),
  isPublic: z.boolean().optional().default(false),
  isSelf: z.boolean().optional().default(false),
  names: z
    .array(
      z.object({
        nameType: z.nativeEnum(NameType),
        fullName: z.string().min(1).max(255),
        firstName: z.string().max(100).optional(),
        lastName: z.string().max(100).optional(),
        middleNames: z.string().max(255).optional(),
        isPrimary: z.boolean().optional().default(false),
      }),
    )
    .optional(),
});
export type CreatePersonDto = z.infer<typeof CreatePersonSchema>;

// Mirror the backend's UpdatePersonDto: strip isSelf and names from the
// schema so the shared client can never send them, then keep lifeStatus
// required because the service still validates deceased coherence on it.
export const UpdatePersonSchema = CreatePersonSchema.omit({
  isSelf: true,
  names: true,
})
  .partial()
  .required({ lifeStatus: true });
export type UpdatePersonDto = z.infer<typeof UpdatePersonSchema>;

// ============================================
// Relationship DTOs
// ============================================

export const CreateParentChildSchema = z.object({
  parentId: z.string().uuid(),
  childId: z.string().uuid(),
  relationshipType: z
    .nativeEnum(ParentRelationshipType)
    .optional()
    .default(ParentRelationshipType.BIOLOGICAL),
  unionId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});
export type CreateParentChildDto = z.infer<typeof CreateParentChildSchema>;

export const CreateUnionSchema = z.object({
  unionType: z.nativeEnum(UnionType).optional().default(UnionType.UNKNOWN),
  status: z.nativeEnum(UnionStatus).optional().default(UnionStatus.UNKNOWN),
  startDate: z.string().optional(),
  startDatePrecision: z.nativeEnum(DatePrecision).optional(),
  startYearApproximate: z.number().int().optional(),
  startDateText: z.string().max(100).optional(),
  endDate: z.string().optional(),
  endReason: z.string().max(50).optional(),
  place: z.string().max(255).optional(),
  notes: z.string().max(500).optional(),
  partners: z
    .array(
      z.object({
        personId: z.string().uuid(),
        role: z.string().max(50).optional(),
        wifeRank: z.number().int().min(1).optional(),
      }),
    )
    .min(2),
});
export type CreateUnionDto = z.infer<typeof CreateUnionSchema>;

// ============================================
// Claim DTOs
// ============================================

export const CreateClaimSchema = z.object({
  personId: z.string().uuid(),
  evidence: z.string().max(1000).optional(),
});
export type CreateClaimDto = z.infer<typeof CreateClaimSchema>;

export const DisputeClaimSchema = z.object({
  reason: z.string().min(10).max(1000),
});
export type DisputeClaimDto = z.infer<typeof DisputeClaimSchema>;

// ============================================
// Identity Document DTOs
// ============================================

export const CreateIdentityDocumentSchema = z.object({
  personId: z.string().uuid(),
  documentType: z.nativeEnum(DocumentType),
  documentNumber: z.string().min(1).max(50),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  issuingAuthority: z.string().max(255).optional(),
});
export type CreateIdentityDocumentDto = z.infer<typeof CreateIdentityDocumentSchema>;

// ============================================
// Invitation DTOs
// ============================================

export const CreateInvitationSchema = z.object({
  targetPersonId: z.string().uuid().optional(),
  targetPhoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/)
    .optional(),
  relationshipHint: z.string().max(100).optional(),
});
export type CreateInvitationDto = z.infer<typeof CreateInvitationSchema>;

// ============================================
// API Response types
// ============================================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
