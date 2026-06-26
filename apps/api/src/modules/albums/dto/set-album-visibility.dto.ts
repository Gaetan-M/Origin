import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisibilityScope } from '@prisma/client';

/**
 * Opt-in publish: change an album's visibility scope (e.g. PRIVATE_SELF ->
 * FAMILY or PUBLIC). Owner-only.
 */
export class SetAlbumVisibilityDto {
  @ApiProperty({ enum: VisibilityScope })
  @IsEnum(VisibilityScope)
  visibilityScope: VisibilityScope;

  @ApiPropertyOptional({
    description: 'Max family-graph degree applied when scope is FAMILY',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  visibleMaxDegree?: number;
}
