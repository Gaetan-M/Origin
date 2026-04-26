import { IsUUID, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiPropertyOptional({ description: 'ID of the target person to link the invitation to' })
  @IsOptional()
  @IsUUID()
  targetPersonId?: string;

  @ApiPropertyOptional({ description: 'Phone number in E.164 format (e.g. +237...)', example: '+237691234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must be in E.164 format (e.g. +237691234567)' })
  targetPhoneNumber?: string;

  @ApiPropertyOptional({ description: 'Hint about the relationship (e.g. "brother", "mother")' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  relationshipHint?: string;
}

export class ConsumeInvitationDto {
  @ApiProperty({ description: 'The invitation token to consume' })
  @IsString()
  token: string;
}
