import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for `POST /tourism/places/:id/verify` (moderator+ only).
 *
 * Grants (`verified: true`) or revokes (`verified: false`) the verified badge
 * of a tourism place. Verification is an editorial trust signal only — it
 * never confers any authority over the family graph.
 */
export class VerifyPlaceDto {
  @ApiProperty({
    description: 'True to grant the verified badge, false to revoke it.',
  })
  @IsBoolean()
  verified!: boolean;

  @ApiPropertyOptional({
    description: 'Optional reason recorded in the audit trail.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
