import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnionType, UnionStatus, DatePrecision } from '@prisma/client';

class UnionPartnerDto {
  @ApiProperty()
  @IsUUID()
  personId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  wifeRank?: number;
}

export class CreateUnionDto {
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

  @ApiProperty({ type: [UnionPartnerDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => UnionPartnerDto)
  partners: UnionPartnerDto[];
}
