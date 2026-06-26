import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CulturalAuthorityKind } from '@prisma/client';

/**
 * Payload for an account self-registering as a cultural authority
 * (chefferie, expert, or institution).
 *
 * Self-registration always produces an UNVERIFIED authority; a moderator
 * verifies it later. Verified authorities gain auto-approval of their content.
 */
export class RegisterAuthorityDto {
  @ApiProperty({
    enum: CulturalAuthorityKind,
    description: 'Kind of authority / Type d’autorité',
  })
  @IsEnum(CulturalAuthorityKind)
  kind!: CulturalAuthorityKind;

  @ApiProperty({
    description: 'Public display name / Nom public affiché',
    maxLength: 160,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Region represented / Région représentée',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;

  @ApiPropertyOptional({
    description: 'Ethnic group represented / Groupe ethnique représenté',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ethnicGroup?: string;

  @ApiPropertyOptional({
    description: 'Short biography / Courte biographie',
    maxLength: 2_000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  bio?: string;
}
