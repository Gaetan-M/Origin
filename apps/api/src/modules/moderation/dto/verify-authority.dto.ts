import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for `POST /moderation/authorities/:id/verify`.
 *
 * Grants (`verified: true`) or revokes (`verified: false`) the verified
 * badge of a cultural authority (chefferie / expert / institution).
 */
export class VerifyAuthorityDto {
  @ApiProperty({
    description: 'True to grant the verified badge, false to revoke it.',
  })
  @IsBoolean()
  verified: boolean;

  @ApiPropertyOptional({
    description: 'Optional reason recorded in the audit trail.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
