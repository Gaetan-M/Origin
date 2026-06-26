import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePhotoDto {
  @ApiProperty({ description: 'Uploaded media id / Identifiant du média' })
  @IsUUID()
  mediaId!: string;

  @ApiPropertyOptional({ description: 'Caption / Légende', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;
}
