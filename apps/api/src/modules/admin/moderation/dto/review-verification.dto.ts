import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export type VerificationDecision = 'APPROVED' | 'REJECTED';

/**
 * Body for `POST /admin/moderation/verifications/:id/resolve`.
 *
 * `decision` decides whether the request lands in `RESOLVED` (approved)
 * or `REJECTED` state — the dashboard exposes this as a binary choice
 * to keep the moderator queue auditable.
 */
export class ResolveVerificationDto {
  @ApiProperty({
    enum: ['APPROVED', 'REJECTED'] as const,
    description: 'Final decision for this verification request.',
  })
  @IsIn(['APPROVED', 'REJECTED'])
  decision: VerificationDecision;

  @ApiPropertyOptional({
    description: 'Optional resolution note shown to the submitter.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
