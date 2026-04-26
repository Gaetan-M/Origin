import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MediaPurpose {
  PROFILE_PHOTO = 'PROFILE_PHOTO',
  DOCUMENT_SCAN = 'DOCUMENT_SCAN',
  MEMORIAL_MEDIA = 'MEMORIAL_MEDIA',
}

export class RequestUploadUrlDto {
  @ApiProperty({ description: 'Original file name', example: 'photo.jpg' })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  @IsString()
  mimeType: string;

  @ApiProperty({
    description: 'Purpose of the media upload',
    enum: MediaPurpose,
    example: MediaPurpose.PROFILE_PHOTO,
  })
  @IsEnum(MediaPurpose)
  purpose: MediaPurpose;
}

export class DirectUploadDto {
  @ApiProperty({ enum: MediaPurpose })
  @IsEnum(MediaPurpose)
  purpose: MediaPurpose;

  @ApiPropertyOptional({
    description: 'Person ID to attach this media to (profile photo)',
  })
  @IsOptional()
  @IsUUID()
  personId?: string;

  @ApiPropertyOptional({ description: 'Year the photo was taken' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1800)
  @Max(2100)
  photoYear?: number;

  @ApiPropertyOptional({
    description:
      'When true (default for profile photos), set this media as the person primary photo',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  setAsPrimary?: boolean;
}

export class UpdateMediaDto {
  @ApiPropertyOptional({ description: 'Year the photo was taken (null clears)' })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  photoYear?: number | null;

  @ApiPropertyOptional({
    description: 'Promote this media as the owning person primary photo',
  })
  @IsOptional()
  @IsBoolean()
  setAsPrimary?: boolean;
}
