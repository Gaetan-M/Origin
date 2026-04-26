import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClaimDto {
  @ApiProperty({ description: 'ID of the person being claimed' })
  @IsUUID()
  personId: string;

  @ApiPropertyOptional({ description: 'Evidence supporting the claim' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  evidence?: string;
}

export class DisputeClaimDto {
  @ApiProperty({ description: 'Reason for disputing the claim' })
  @IsString()
  @MaxLength(2000)
  reason: string;
}
