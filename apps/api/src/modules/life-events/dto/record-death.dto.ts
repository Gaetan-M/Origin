import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DatePrecision, VisibilityScope } from '@prisma/client';

/**
 * Record a death: flips an existing Person.life_status to DECEASED and stores
 * the deceased date. All existing graph edges are preserved (never deleted).
 */
export class RecordDeathDto {
  @ApiProperty({ description: 'Id of the existing person who has died' })
  @IsUUID('4')
  personId: string;

  @ApiPropertyOptional({ description: 'Date of death (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  deceasedDate?: string;

  @ApiPropertyOptional({ enum: DatePrecision })
  @IsOptional()
  @IsEnum(DatePrecision)
  deceasedDatePrecision?: DatePrecision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deceasedPlace?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deceasedRegion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deceasedCountry?: string;

  @ApiPropertyOptional({ enum: VisibilityScope, default: VisibilityScope.FAMILY })
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
