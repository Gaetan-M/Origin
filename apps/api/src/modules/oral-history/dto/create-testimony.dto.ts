import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisibilityScope } from '@prisma/client';

/**
 * Kind of oral-history record, stored in Source.source_type (varchar 50).
 *
 * The column is intentionally a free string at the DB level; this enum keeps
 * the API surface disciplined while leaving room for new testimony formats
 * without a migration.
 */
export enum TestimonyKind {
  ORAL_TESTIMONY = 'ORAL_TESTIMONY',
  INTERVIEW = 'INTERVIEW',
  STORY = 'STORY',
  SONG = 'SONG',
  PRAYER = 'PRAYER',
}

/**
 * Payload for capturing an audio/video testimony from an elder.
 *
 * URGENCY: elders carry undocumented genealogy, names, migrations, rites and
 * proverbs in their memory alone. Every recording made here is knowledge
 * rescued before it is lost forever — the DTO is deliberately lightweight so a
 * field recording can be saved in seconds, transcript added later.
 *
 * The actual audio/video file is uploaded through the EXISTING media module;
 * this DTO only references the resulting `mediaId`. At least one of
 * `personId` / `unionId` MUST be supplied (validated in the service) so every
 * testimony is anchored to the graph.
 */
export class CreateTestimonyDto {
  @ApiPropertyOptional({
    description:
      'Person the testimony is about / Personne concernée par le témoignage',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  personId?: string;

  @ApiPropertyOptional({
    description:
      'Union the testimony is about / Union concernée par le témoignage',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  unionId?: string;

  @ApiProperty({
    description:
      'Id of the already-uploaded audio/video media / Identifiant du média audio ou vidéo déjà téléversé',
    format: 'uuid',
  })
  @IsUUID()
  mediaId!: string;

  @ApiPropertyOptional({
    description:
      'Transcript of the recording (can be added later) / Transcription de l’enregistrement (peut être ajoutée plus tard)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  transcript?: string;

  @ApiPropertyOptional({
    description: 'Short title for the testimony / Titre court du témoignage',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    enum: TestimonyKind,
    description:
      'Kind of testimony / Type de témoignage (défaut: ORAL_TESTIMONY)',
    default: TestimonyKind.ORAL_TESTIMONY,
  })
  @IsOptional()
  @IsEnum(TestimonyKind)
  sourceType?: TestimonyKind;

  @ApiPropertyOptional({
    enum: VisibilityScope,
    description:
      'Who may see this testimony / Qui peut voir ce témoignage (défaut: PRIVATE_SELF)',
    default: VisibilityScope.PRIVATE_SELF,
  })
  @IsOptional()
  @IsEnum(VisibilityScope)
  visibilityScope?: VisibilityScope;
}
