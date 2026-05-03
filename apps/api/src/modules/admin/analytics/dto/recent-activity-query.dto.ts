import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query DTO for the recent-activity feed.
 *
 * `limit` is clamped to 50 server-side regardless of input so a stray
 * client cannot pull a giant slice of the contributions table.
 */
export class RecentActivityQueryDto {
  @ApiPropertyOptional({
    description: 'How many recent contribution rows to return (1..50). Defaults to 20.',
    minimum: 1,
    maximum: 50,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
