import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LifeStatus } from '@prisma/client';

/**
 * Coerces query-string booleans ("true"/"false"/"1"/"0") into real booleans.
 * class-validator's @IsBoolean rejects raw strings, so we normalise upstream.
 */
const toBoolean = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
  }
  return undefined;
};

/**
 * Filter envelope for `GET /admin/persons`.
 *
 * `lifeStatus` accepts a comma-separated list (e.g. `ALIVE,UNKNOWN`) so
 * the dashboard can request several statuses in a single round-trip.
 */
export class ListPersonsDto {
  @ApiPropertyOptional({
    description:
      'Free-text search across persons.displayName and person_names.fullName (ILIKE).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    description:
      'Comma-separated list of LifeStatus values (e.g. ALIVE,DECEASED).',
    enum: LifeStatus,
    isArray: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  lifeStatus?: string;

  @ApiPropertyOptional({ description: 'Filter by hasPhoto flag.' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasPhoto?: boolean;

  @ApiPropertyOptional({
    description:
      'When true, only return persons with claimedByAccountId IS NOT NULL. When false, only unclaimed.',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasClaim?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  villageOrigin?: string;

  @ApiPropertyOptional({ description: 'Filter by birthRegion.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ description: 'Filter by birthCountry.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Include soft-deleted persons (default false).',
    default: false,
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: ['createdAt', 'displayName'], default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt', 'displayName'])
  sortBy?: 'createdAt' | 'displayName';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
