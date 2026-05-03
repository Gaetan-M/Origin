import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for `POST /admin/moderation/identity-documents/:id/verify`.
 *
 * A note is optional — when provided, it is logged in the audit trail
 * as the rationale for trusting the document.
 */
export class VerifyDocumentDto {
  @ApiPropertyOptional({
    description: 'Optional moderator note recorded in the audit trail.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

/**
 * Body for `POST /admin/moderation/identity-documents/:id/reject`.
 */
export class RejectDocumentDto {
  @ApiProperty({ description: 'Reason for marking the document disputed.' })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;
}
