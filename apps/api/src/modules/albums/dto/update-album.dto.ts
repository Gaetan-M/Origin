import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlbumKind, VisibilityScope } from '@prisma/client';

/**
 * Patch an album's metadata. Owner-only. Every supplied field is optional;
 * omitted fields are left untouched. Visibility can also be changed here, but
 * the dedicated `PATCH :id/visibility` endpoint is preferred for opt-in
 * publishing flows.
 */
export class UpdateAlbumDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: AlbumKind })
  @IsOptional()
  @IsEnum(AlbumKind)
  kind?: AlbumKind;

  @ApiPropertyOptional({ description: 'Media id used as album cover' })
  @IsOptional()
  @IsUUID('4')
  coverMediaId?: string;

  @ApiPropertyOptional({ enum: VisibilityScope })
  @IsOptional()
  @IsEnum(VisibilityScope)
  visibilityScope?: VisibilityScope;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  visibleMaxDegree?: number;
}
