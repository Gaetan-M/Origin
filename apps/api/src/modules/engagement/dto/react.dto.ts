import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

/**
 * Closed reaction vocabulary for public discovery entities. The column itself
 * is a free VARCHAR, but the API validates against this set so the client
 * cannot inject arbitrary values.
 */
export const ENGAGEMENT_REACTION_TYPES = [
  'LIKE',
  'LOVE',
  'WOW',
  'VISITED',
] as const;

export type EngagementReactionType =
  (typeof ENGAGEMENT_REACTION_TYPES)[number];

export class ReactDto {
  @ApiProperty({
    enum: ENGAGEMENT_REACTION_TYPES,
    description: 'Type de réaction / Reaction type',
    example: 'LIKE',
  })
  @IsString()
  @IsIn(ENGAGEMENT_REACTION_TYPES)
  type!: EngagementReactionType;
}
