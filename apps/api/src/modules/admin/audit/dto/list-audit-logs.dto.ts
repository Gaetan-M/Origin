import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdminActionSeverity } from '@prisma/client';

/**
 * Query parameters for listing admin audit log entries.
 *
 * Every field is optional so the same DTO covers both unfiltered scrolls
 * and tightly-scoped investigations. `page`/`limit` are always honoured.
 */
export class ListAuditLogsDto {
  @ApiPropertyOptional({ description: 'Filter by the actor account uuid' })
  @IsOptional()
  @IsUUID()
  actorAccountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by the targeted account uuid (when the action concerns a specific account)',
  })
  @IsOptional()
  @IsUUID()
  targetAccountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by the targeted entity type (e.g. "Person", "Claim")',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetEntityType?: string;

  @ApiPropertyOptional({ description: 'Filter by the targeted entity uuid' })
  @IsOptional()
  @IsUUID()
  targetEntityId?: string;

  @ApiPropertyOptional({
    description:
      'Filter by category — substring match (case-insensitive). e.g. "accounts", "moderation.merge.approve"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ enum: AdminActionSeverity, description: 'Filter by exact severity' })
  @IsOptional()
  @IsEnum(AdminActionSeverity)
  severity?: AdminActionSeverity;

  @ApiPropertyOptional({
    description: 'Free-text search across action and reason (case-insensitive ILIKE)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ description: 'Inclusive lower bound on createdAt (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Inclusive upper bound on createdAt (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Page number (1-indexed)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page (max 200)', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

/**
 * Range query for the export endpoint. Both bounds are required to keep
 * downloads scoped — exporting the entire audit history in one shot is
 * an explicit anti-pattern.
 */
export class ExportAuditLogsDto {
  @ApiPropertyOptional({
    description: 'Inclusive lower bound on createdAt (ISO 8601). Required.',
    required: true,
  })
  @IsISO8601()
  dateFrom!: string;

  @ApiPropertyOptional({
    description: 'Inclusive upper bound on createdAt (ISO 8601). Required.',
    required: true,
  })
  @IsISO8601()
  dateTo!: string;
}
