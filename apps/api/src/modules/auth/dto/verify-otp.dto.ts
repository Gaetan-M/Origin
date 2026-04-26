import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '+237690000000', description: 'Phone number in E.164 format' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format (e.g. +237690000000, +33612345678)',
  })
  phoneNumber: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'OTP code must be 6 digits' })
  code: string;
}
