import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SuggestEditDto {
  @ApiProperty({ description: 'Field name to correct / Champ à corriger', minLength: 1, maxLength: 60 })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  field!: string;

  @ApiProperty({
    description: 'Proposed value / Valeur proposée',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  proposedValue!: string;

  @ApiPropertyOptional({ description: 'Optional note / Note facultative', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
