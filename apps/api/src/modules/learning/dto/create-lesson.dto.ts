import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LearningLevel } from '@prisma/client';

/**
 * Payload for authoring a structured PUBLIC mini-lesson (especially LANGUAGE
 * lessons) to help preserve culture.
 *
 * A lesson is authored content — optionally attributed to a verified
 * CulturalAuthority. It belongs to the public learning world and MUST never
 * reference any family-graph / private person data; the DTO therefore exposes
 * no person/relationship fields whatsoever.
 */
export class CreateLessonDto {
  @ApiProperty({
    description: 'Title of the lesson / Titre de la leçon',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    description: 'Short description of the lesson / Description courte',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Body / teaching content of the lesson / Contenu pédagogique',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40_000)
  content?: string;

  @ApiPropertyOptional({
    description:
      'BCP-47 / ISO code of the language being taught / Code de la langue enseignée (ex: bas, ewo, dua)',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  languageCode?: string;

  @ApiPropertyOptional({
    enum: LearningLevel,
    description: 'Difficulty level / Niveau de difficulté',
    default: LearningLevel.BEGINNER,
  })
  @IsOptional()
  @IsEnum(LearningLevel)
  level?: LearningLevel;

  @ApiPropertyOptional({
    description: 'Ethnic group the lesson relates to / Groupe ethnique concerné',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ethnicGroup?: string;

  @ApiPropertyOptional({
    description:
      'Optional authority the lesson is published under / Autorité culturelle de publication',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  authorityId?: string;

  @ApiPropertyOptional({
    description: 'Optional attached media id / Identifiant média associé',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  mediaId?: string;

  @ApiPropertyOptional({
    description:
      'Whether the lesson is ticketed / premium (links to a live LESSON or paywall) / Leçon payante',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTicketed?: boolean;

  @ApiPropertyOptional({
    description:
      'Optional live session this lesson is delivered through / Session live associée',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  liveSessionId?: string;

  @ApiPropertyOptional({
    description:
      'Ordering position within a curriculum (lower first) / Position dans le cursus',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
