import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query parameters for the degree-bounded family feed.
 *
 * Pagination is keyset/cursor based on (created_at desc, id desc). The cursor
 * is an opaque, base64url-encoded token produced by the service — clients must
 * treat it as a black box and never construct one by hand.
 */
export class FeedQueryDto {
  @ApiPropertyOptional({
    description:
      'Opaque pagination cursor returned as `nextCursor` by a previous call. Omit to fetch the first page.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of visible posts to return per page (1-50).',
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
}
