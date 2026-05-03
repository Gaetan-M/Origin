import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { LifeStatus, VerificationLevel } from '@prisma/client';

/**
 * Body for `PATCH /admin/persons/:id`.
 *
 * All editable fields are optional — moderators submit deltas only —
 * but `reason` is mandatory because every admin write must leave a
 * traceable rationale in the audit log.
 *
 * Note: this DTO intentionally does NOT expose `claimedByAccountId`,
 * `createdByAccountId`, `normalizedName`, or names[]. Those have
 * dedicated flows (claims module, merge tooling, person-names endpoints).
 */
export class AdminUpdatePersonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ example: 'M', enum: ['M', 'F', 'O', 'U'] })
  @IsOptional()
  @IsString()
  @MaxLength(1)
  gender?: string;

  @ApiPropertyOptional({ enum: LifeStatus })
  @IsOptional()
  @IsEnum(LifeStatus)
  lifeStatus?: LifeStatus;

  @ApiPropertyOptional({ description: 'ISO-8601 date string.' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  birthYearApproximate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  birthPlace?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  birthRegion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  birthCountry?: string;

  @ApiPropertyOptional({ description: 'ISO-8601 date string.' })
  @IsOptional()
  @IsDateString()
  deceasedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  deceasedYearApproximate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ethnicity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  villageOrigin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  chefferie?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  biography?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  occupation?: string;

  @ApiPropertyOptional({ description: 'E.164 format (+237...).' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Privacy level (1-3). Higher = more restrictive.',
    minimum: 1,
    maximum: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  privacyLevel?: number;

  @ApiPropertyOptional({ enum: VerificationLevel })
  @IsOptional()
  @IsEnum(VerificationLevel)
  verificationLevel?: VerificationLevel;

  @ApiProperty({
    description: 'Mandatory rationale recorded in the admin audit trail.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;
}
