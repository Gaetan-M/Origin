import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LiveSessionKind, VisibilityScope } from '@prisma/client';

/**
 * Payload to schedule a new LIVE session.
 *
 * The session is created SCHEDULED; the server assigns the unique LiveKit
 * room name. PRIVATE/FAMILY ceremonies anchor their visibility on
 * `subjectPersonId` (the person the live concerns), which is also the node the
 * degree gate measures against. PUBLIC LESSON/MASTERCLASS sessions require the
 * host to be a verified cultural authority (enforced server-side).
 */
export class CreateLiveDto {
  @ApiProperty({
    description: 'Title of the live session / Titre de la session en direct',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    description: 'Free-text description / Description libre',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  description?: string;

  @ApiProperty({
    enum: LiveSessionKind,
    description: 'Kind of live session / Type de session en direct',
  })
  @IsEnum(LiveSessionKind)
  kind!: LiveSessionKind;

  @ApiPropertyOptional({
    enum: VisibilityScope,
    description:
      'Visibility scope (defaults to FAMILY) / Portée de visibilité (FAMILY par défaut)',
  })
  @IsOptional()
  @IsEnum(VisibilityScope)
  visibilityScope?: VisibilityScope;

  @ApiPropertyOptional({
    description:
      'Max family-graph degree allowed for FAMILY scope / Degré familial maximal autorisé',
    minimum: 0,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  visibleMaxDegree?: number;

  @ApiPropertyOptional({
    description:
      'Person the live concerns + FAMILY visibility anchor / Personne concernée et ancre de visibilité',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  subjectPersonId?: string;

  @ApiPropertyOptional({
    description:
      'Cultural authority the host acts as (for PUBLIC lessons/masterclasses) / Autorité culturelle de l’hôte',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  hostAuthorityId?: string;

  @ApiPropertyOptional({
    description:
      'Planned start time (ISO 8601) / Heure de début prévue (ISO 8601)',
  })
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}
