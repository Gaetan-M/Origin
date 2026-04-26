import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemFamilyCodeDto {
  @ApiProperty({
    example: 'MBALLA-2847',
    description: 'Family code to redeem (case-insensitive)',
  })
  @IsString()
  @Matches(/^[A-Za-z]{4,8}-[0-9]{3,5}$/, {
    message: 'Invalid family code format (e.g. MBALLA-2847)',
  })
  code: string;
}
