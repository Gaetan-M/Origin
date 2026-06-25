import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsUUID,
  IsArray,
  IsDateString,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DatePrecision, UnionType, UnionStatus, VisibilityScope } from '@prisma/client';

/**
 * One partner of a union. `wifeRank` supports polygamous customary unions
 * (1 = first wife, 2 = second wife, ...). `role` is free-form ('husband',
 * 'wife', 'partner', ...).
 */
export class RecordUnionPartnerDto {
  @ApiProperty({ description: 'Person id of this partner' })
  @IsUUID('4')
  personId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  role?: string;

  @ApiPropertyOptional({ description: 'Wife rank for polygamous unions' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  wifeRank?: number;
}

/**
 * Record a union: creates a Union plus one UnionPartner row per partner and a
 * UNION life event. Requires at least two partners.
 */
export class RecordUnionDto {
  @ApiProperty({ type: [RecordUnionPartnerDto], description: 'At least two partners' })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => RecordUnionPartnerDto)
  partners: RecordUnionPartnerDto[];

  @ApiPropertyOptional({ enum: UnionType, default: UnionType.UNKNOWN })
  @IsOptional()
  @IsEnum(UnionType)
  unionType?: UnionType;

  @ApiPropertyOptional({ enum: UnionStatus, default: UnionStatus.UNKNOWN })
  @IsOptional()
  @IsEnum(UnionStatus)
  status?: UnionStatus;

  @ApiPropertyOptional({ description: 'Union start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ enum: DatePrecision })
  @IsOptional()
  @IsEnum(DatePrecision)
  startDatePrecision?: DatePrecision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  place?: string;

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
