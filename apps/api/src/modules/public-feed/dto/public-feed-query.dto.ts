import { IsEnum, IsOptional, IsString, Max, MaxLength, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CulturalContentType } from '@prisma/client';

/**
 * Query parameters for the PUBLIC cultural-heritage discovery feed.
 *
 * This feed is fully public: no authentication is required and the payload is
 * deliberately limited to public cultural content. Pagination is keyset/cursor
 * based on (is_from_verified_authority desc, created_at desc, id desc). The
 * cursor is an opaque, base64url-encoded token produced by the service — clients
 * must treat it as a black box and never construct one by hand.
 */
export class PublicFeedQueryDto {
  @ApiPropertyOptional({
    description:
      'Opaque pagination cursor returned as `nextCursor` by a previous call. Omit to fetch the first page.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of items to return per page (1-50).',
    minimum: 1,
    maximum: 50,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by cultural content type (langue, recette, conte, etc.).',
    enum: CulturalContentType,
  })
  @IsOptional()
  @IsEnum(CulturalContentType)
  contentType?: CulturalContentType;

  @ApiPropertyOptional({
    description: 'Filter by ethnic group / groupe ethnique.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ethnicGroup?: string;
}
