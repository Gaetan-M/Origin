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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlbumKind, VisibilityScope } from '@prisma/client';

/**
 * Create a new album (a person's life documented over time).
 *
 * An album is OPTIONALLY about a subject person (`subjectPersonId`). When the
 * album is FAMILY-scoped that subject is the node used for degree-bounded
 * access; a FAMILY album with no subject is therefore owner-only in practice.
 */
export class CreateAlbumDto {
  @ApiPropertyOptional({
    description:
      'Id of the person this album is about (the subject) / Personne sujet',
  })
  @IsOptional()
  @IsUUID('4')
  subjectPersonId?: string;

  @ApiProperty({ description: 'Album title / Titre de l’album', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Free-text description / Description' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: AlbumKind, default: AlbumKind.PERSONAL })
  @IsOptional()
  @IsEnum(AlbumKind)
  kind?: AlbumKind;

  @ApiPropertyOptional({ description: 'Media id used as album cover' })
  @IsOptional()
  @IsUUID('4')
  coverMediaId?: string;

  @ApiPropertyOptional({
    enum: VisibilityScope,
    default: VisibilityScope.PRIVATE_SELF,
    description: 'Defaults to PRIVATE_SELF — opt in to FAMILY/PUBLIC',
  })
  @IsOptional()
  @IsEnum(VisibilityScope)
  visibilityScope?: VisibilityScope;

  @ApiPropertyOptional({
    description: 'Max family-graph degree for FAMILY visibility',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  visibleMaxDegree?: number;
}
