import { IsEmail, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUpdateAccountDto {
  @ApiPropertyOptional({ description: 'Display name visible in the admin dashboard' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  // ValidateIf — allow explicit null to clear, but still validate format when a non-empty string is supplied.
  @ApiPropertyOptional({ description: 'Contact email; pass null to clear', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ description: 'Internal moderation notes (admin-only)' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
