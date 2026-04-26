import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UnionType, UnionStatus, DatePrecision } from '@prisma/client';

export class UpdateUnionDto {
  @ApiPropertyOptional({ enum: UnionType })
  @IsOptional()
  @IsEnum(UnionType)
  unionType?: UnionType;

  @ApiPropertyOptional({ enum: UnionStatus })
  @IsOptional()
  @IsEnum(UnionStatus)
  status?: UnionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ enum: DatePrecision })
  @IsOptional()
  @IsEnum(DatePrecision)
  startDatePrecision?: DatePrecision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  startYearApproximate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  place?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
