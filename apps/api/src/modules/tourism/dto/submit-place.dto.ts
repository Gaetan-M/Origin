import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TourismCategory, TourismSource } from '@prisma/client';

/**
 * Payload for submitting a PUBLIC tourism / heritage place.
 *
 * INDEPENDENCE: official (MINISTRY) and NGO data are accepted ONLY as a cited
 * SOURCE — the `source` + `sourceRef` provenance fields make the origin
 * transparent. A submission NEVER grants the source any authority over the
 * family graph, and this DTO exposes no person/relationship fields whatsoever.
 *
 * Every submission starts UNVERIFIED; a moderator verifies it later.
 */
export class SubmitPlaceDto {
  @ApiProperty({
    description: 'Name of the place / Nom du lieu',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'Free-text description / Description du lieu',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Region / Région (ex: Ouest, Centre, Littoral)',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;

  @ApiProperty({
    enum: TourismCategory,
    description: 'Kind of place / Catégorie du lieu',
  })
  @IsEnum(TourismCategory)
  category!: TourismCategory;

  @ApiPropertyOptional({
    description: 'Latitude (WGS84, -90..90) / Latitude',
  })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude (WGS84, -180..180) / Longitude',
  })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({
    enum: TourismSource,
    description:
      'Provenance of the data — MINISTRY of Tourism, an NGO, or a COMMUNITY contribution / Provenance de la donnée',
  })
  @IsEnum(TourismSource)
  source!: TourismSource;

  @ApiPropertyOptional({
    description:
      'Provenance citation: official reference, document, or URL backing the source / Référence de provenance (citation, document ou URL)',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  sourceRef?: string;

  @ApiPropertyOptional({
    description: 'Optional attached media id / Identifiant média associé',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  mediaId?: string;
}
