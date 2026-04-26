import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFamilyCodeDto {
  @ApiPropertyOptional({
    example: 'Famille Mballa',
    description: 'Optional label to recognize this code among many',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({
    example: 50,
    description: 'Maximum number of redemptions before the code expires (default 50)',
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxUses?: number;

  @ApiPropertyOptional({
    example: 90,
    description: 'Validity in days (default 90)',
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiryDays?: number;
}
