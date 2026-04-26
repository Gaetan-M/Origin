import { IsOptional, IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePinDto {
  @ApiPropertyOptional({ description: 'Current PIN (required when changing an existing PIN)', example: '1234' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'currentPin must be 4 to 6 digits' })
  currentPin?: string;

  @ApiProperty({ description: 'New PIN (4 to 6 digits)', example: '5678' })
  @IsString()
  @MinLength(4, { message: 'newPin must be at least 4 digits' })
  @MaxLength(6, { message: 'newPin must be at most 6 digits' })
  @Matches(/^\d{4,6}$/, { message: 'newPin must be 4 to 6 digits' })
  newPin: string;
}

export class RemovePinDto {
  @ApiProperty({ description: 'Current PIN to verify before removal', example: '1234' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'currentPin must be 4 to 6 digits' })
  currentPin: string;
}
