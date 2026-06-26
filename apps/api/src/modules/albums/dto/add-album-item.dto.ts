import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Append a media item to an album's timeline.
 *
 * The file itself is owned by the existing Media module — we only REFERENCE
 * `mediaId`. `takenAt` is a precise capture date; `takenAtText` carries fuzzy
 * dates ("été 1994", "circa 1960") when the exact day is unknown. `position`
 * is optional — when omitted the item is appended to the end of the timeline.
 */
export class AddAlbumItemDto {
  @ApiProperty({ description: 'Id of an existing Media file to reference' })
  @IsUUID('4')
  mediaId: string;

  @ApiPropertyOptional({ description: 'Caption / Légende', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @ApiPropertyOptional({ description: 'Capture date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  takenAt?: string;

  @ApiPropertyOptional({
    description: 'Fuzzy/approximate capture date / Date approximative',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  takenAtText?: string;

  @ApiPropertyOptional({
    description: 'Explicit timeline position; auto-appended when omitted',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
