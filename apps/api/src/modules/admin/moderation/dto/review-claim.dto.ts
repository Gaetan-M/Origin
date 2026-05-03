import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for `POST /admin/moderation/claims/:id/approve`.
 *
 * The note is optional: an approval is a positive resolution where the
 * moderator might just want to leave a short trace of why the evidence
 * was sufficient, but the audit log already stores actor + before/after.
 */
export class ApproveClaimDto {
  @ApiPropertyOptional({
    description: 'Optional moderator note recorded in the audit trail.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

/**
 * Body for `POST /admin/moderation/claims/:id/reject` and
 * `POST /admin/moderation/claims/:id/dispute`.
 *
 * A reason is mandatory — a refusal that nobody can later explain is
 * worse than no decision at all.
 */
export class RejectClaimDto {
  @ApiProperty({ description: 'Reason exposed to the claimer.' })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;
}

export class DisputeClaimDto {
  @ApiProperty({ description: 'Reason the claim is being put back into dispute.' })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;
}
