import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Patch a timeline item's metadata. Owner-only. The referenced `mediaId` is
 * immutable — to change the file the item must be removed and re-added. Every
 * supplied field is optional; omitted fields are left untouched.
 */
export class UpdateAlbumItemDto {
  @ApiPropertyOptional({ description: 'Caption / Légende', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string | null;

  @ApiPropertyOptional({ description: 'Capture date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  takenAt?: string | null;

  @ApiPropertyOptional({
    description: 'Fuzzy/approximate capture date / Date approximative',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  takenAtText?: string | null;

  @ApiPropertyOptional({ description: 'Explicit timeline position' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
