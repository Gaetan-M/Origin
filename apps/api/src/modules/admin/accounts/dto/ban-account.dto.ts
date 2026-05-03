import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BanAccountDto {
  @ApiProperty({
    description: 'Reason shown to support and recorded in the audit log',
    minLength: 5,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class DeleteAccountDto {
  @ApiProperty({
    description: 'Reason for soft-deleting this account; required for the audit trail',
    minLength: 5,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}
