import { IsString, Matches, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OtpChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  VOICE = 'VOICE',
}

export class RequestOtpDto {
  @ApiProperty({ example: '+237690000000', description: 'Phone number in E.164 format' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format (e.g. +237690000000, +33612345678)',
  })
  phoneNumber: string;

  @ApiPropertyOptional({ enum: OtpChannel, default: OtpChannel.SMS })
  @IsOptional()
  @IsEnum(OtpChannel)
  channel?: OtpChannel = OtpChannel.SMS;
}
