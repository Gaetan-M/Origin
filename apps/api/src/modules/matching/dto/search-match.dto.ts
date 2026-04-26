import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchMatchDto {
  @ApiProperty({ description: 'Name to search for', example: 'Jean-Paul Mbarga' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Approximate birth year', example: 1965 })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  birthYear?: number;

  @ApiPropertyOptional({ description: 'Village of origin', example: 'Nkolbisson' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  village?: string;

  @ApiPropertyOptional({ description: 'Parent name for cross-referencing', example: 'Pierre Mbarga' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  parentName?: string;
}
