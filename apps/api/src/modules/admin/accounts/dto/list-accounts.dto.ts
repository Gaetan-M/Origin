import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccountRole } from '@prisma/client';

/**
 * Coerces string query-param booleans ("true"/"false"/"1"/"0") into real
 * booleans. class-validator's @IsBoolean rejects strings outright, so we
 * normalise upstream via @Transform.
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

export class ListAccountsDto {
  @ApiPropertyOptional({
    description: 'Free-text search across phoneNumber, email, fullName (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ enum: AccountRole, description: 'Filter by exact role' })
  @IsOptional()
  @IsEnum(AccountRole)
  role?: AccountRole;

  @ApiPropertyOptional({ description: 'Filter by ban status' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isBanned?: boolean;

  @ApiPropertyOptional({
    description: 'Include soft-deleted accounts (default false)',
    default: false,
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'When true, only return accounts with at least one VERIFIED claim',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasClaim?: boolean;

  @ApiPropertyOptional({ description: 'Page number (1-indexed)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page (max 100)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: ['createdAt', 'lastLoginAt'], default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt', 'lastLoginAt'])
  sortBy?: 'createdAt' | 'lastLoginAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
