import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
  ValidateNested,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LifeStatus, DatePrecision, NameType } from '@prisma/client';

class CreatePersonNameDto {
  @ApiProperty({ enum: NameType })
  @IsEnum(NameType)
  nameType: NameType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  middleNames?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreatePersonDto {
  @ApiProperty({ example: 'Jean-Paul Mbarga' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName: string;

  @ApiPropertyOptional({ example: 'M', enum: ['M', 'F', 'O', 'U'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ enum: LifeStatus })
  @IsEnum(LifeStatus)
  lifeStatus: LifeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  deceasedAssumed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: DatePrecision })
  @IsOptional()
  @IsEnum(DatePrecision)
  birthDatePrecision?: DatePrecision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  birthYearApproximate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  birthDateText?: string;

  @ValidateIf((o) => o.lifeStatus === 'DECEASED')
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deceasedDate?: string;

  @ApiPropertyOptional({ enum: DatePrecision })
  @IsOptional()
  @IsEnum(DatePrecision)
  deceasedDatePrecision?: DatePrecision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  deceasedYearApproximate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deceasedDateText?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deceasedPlace?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentResidencePlace?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  currentResidenceCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ethnicity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  villageOrigin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  chefferie?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  biography?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Set to true to auto-claim this person as yourself' })
  @IsOptional()
  @IsBoolean()
  isSelf?: boolean;

  @ApiPropertyOptional({ type: [CreatePersonNameDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePersonNameDto)
  names?: CreatePersonNameDto[];
}
