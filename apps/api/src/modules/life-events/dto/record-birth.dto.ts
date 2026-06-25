import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsArray,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DatePrecision,
  ParentRelationshipType,
  VisibilityScope,
} from '@prisma/client';

/**
 * Record a birth: creates a new ALIVE Person and parent_child edges to the
 * given parents. Parentage is expressed ONLY through ParentChild edges —
 * never father_id/mother_id on Person.
 */
export class RecordBirthDto {
  @ApiProperty({ description: 'Display name of the newborn / new person' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName: string;

  @ApiPropertyOptional({ description: 'Single-character gender code (M/F/O/U)' })
  @IsOptional()
  @IsString()
  @MaxLength(1)
  gender?: string;

  @ApiPropertyOptional({ description: 'Birth date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: DatePrecision })
  @IsOptional()
  @IsEnum(DatePrecision)
  birthDatePrecision?: DatePrecision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  birthPlace?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  birthRegion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  birthCountry?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Person ids of the parents to link via ParentChild edges',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  parentPersonIds?: string[];

  @ApiPropertyOptional({ enum: ParentRelationshipType })
  @IsOptional()
  @IsEnum(ParentRelationshipType)
  relationshipType?: ParentRelationshipType;

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
