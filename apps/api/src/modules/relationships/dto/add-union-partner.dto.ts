import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddUnionPartnerDto {
  @ApiProperty()
  @IsUUID()
  personId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  wifeRank?: number;
}
