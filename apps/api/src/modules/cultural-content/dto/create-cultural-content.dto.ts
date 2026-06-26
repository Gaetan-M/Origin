import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CulturalContentType } from '@prisma/client';

/**
 * Payload for authoring a piece of PUBLIC cultural-heritage content
 * (language, recipe, tale, proverb, rite, custom, music...).
 *
 * Content authored here is always PUBLIC by design — it belongs to the public
 * discovery world and MUST never reference family-graph data. The DTO therefore
 * exposes no person/relationship fields whatsoever.
 */
export class CreateCulturalContentDto {
  @ApiProperty({
    enum: CulturalContentType,
    description:
      'Kind of cultural heritage content / Type de contenu patrimonial',
  })
  @IsEnum(CulturalContentType)
  contentType!: CulturalContentType;

  @ApiProperty({
    description: 'Title of the content / Titre du contenu',
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    description: 'Free-text body of the content / Corps du contenu',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  body?: string;

  @ApiPropertyOptional({
    description:
      'BCP-47 / ISO language code of the content / Code langue du contenu (ex: bas, ewo, fr)',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  languageCode?: string;

  @ApiPropertyOptional({
    description: 'Region of origin / Région d’origine',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;

  @ApiPropertyOptional({
    description: 'Ethnic group of origin / Groupe ethnique d’origine',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ethnicGroup?: string;

  @ApiPropertyOptional({
    description: 'Optional attached media id / Identifiant média associé',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  mediaId?: string;

  @ApiPropertyOptional({
    description:
      'Optional authority the content is published under / Autorité culturelle de publication',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  authorityId?: string;
}
