import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query DTO for the growth time-series endpoint.
 *
 * Bounded at 365d to keep the underlying generate_series scan cheap and
 * the JSON payload small for the dashboard charts.
 */
export class GrowthQueryDto {
  @ApiPropertyOptional({
    description: 'Number of days of history to return (1..365). Defaults to 30.',
    minimum: 1,
    maximum: 365,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}
