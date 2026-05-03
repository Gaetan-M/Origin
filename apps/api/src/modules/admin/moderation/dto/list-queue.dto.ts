import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Shared pagination + filter envelope for the moderation list endpoints.
 *
 * `status` is a comma-separated list (e.g. `PENDING,DISPUTED`) so the
 * dashboard can request multiple states in a single round-trip without
 * relying on repeated query keys.
 */
export class ListQueueDto {
  @ApiPropertyOptional({
    description:
      'Comma-separated list of statuses to include. Endpoint-specific defaults apply when omitted.',
    example: 'PENDING,DISPUTED',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  status?: string;

  @ApiPropertyOptional({
    description: 'Free-text search (matches person displayName or account phoneNumber).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
