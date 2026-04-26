import { IsOptional, IsString, IsBoolean, IsEmail, IsIn, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAccountDto {
  @ApiPropertyOptional({ description: 'Language preference', enum: ['fr', 'en'], example: 'fr' })
  @IsOptional()
  @IsString()
  @IsIn(['fr', 'en'], { message: 'languagePreference must be either "fr" or "en"' })
  languagePreference?: string;

  @ApiPropertyOptional({ description: 'Enable data saver mode', example: false })
  @IsOptional()
  @IsBoolean()
  dataSaverMode?: boolean;

  @ApiPropertyOptional({ description: 'Enable large text mode', example: false })
  @IsOptional()
  @IsBoolean()
  largeTextMode?: boolean;

  @ApiPropertyOptional({ description: 'Email address', example: 'user@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Enable WhatsApp notifications', example: true })
  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;
}
