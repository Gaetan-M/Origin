import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountRole } from '@prisma/client';

export class UpdateAccountRoleDto {
  @ApiProperty({
    enum: AccountRole,
    description: 'Target role to assign. Granting ADMIN+ requires SUPER_ADMIN.',
  })
  @IsEnum(AccountRole)
  role!: AccountRole;

  @ApiProperty({
    description: 'Human-readable justification recorded in the audit log',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
