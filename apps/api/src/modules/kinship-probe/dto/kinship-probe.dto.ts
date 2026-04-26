import { IsString, Matches, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KinshipProbeDto {
  @ApiProperty({
    example: '+237690000000',
    description: 'Phone number of the relative (E.164 format)',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format (e.g. +237690000000, +33612345678)',
  })
  targetPhoneNumber: string;

  @ApiPropertyOptional({
    example: 'oncle',
    description: 'Claimed relationship (oncle, tante, cousin, etc.)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  claimedRelationship?: string;

  @ApiPropertyOptional({
    example: 'Salut tonton, je suis le fils de Marie',
    description: 'Optional short message attached to the probe',
    maxLength: 280,
  })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  message?: string;
}
