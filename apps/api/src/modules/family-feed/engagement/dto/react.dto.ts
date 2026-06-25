import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

/**
 * Allowed reaction types. Kept as a small, closed vocabulary appropriate to a
 * genealogical / memorial context (not generic social-network reactions). The
 * column itself is a free String, but the API validates against this set so the
 * client cannot inject arbitrary values.
 */
export const REACTION_TYPES = [
  'LIKE',
  'LOVE',
  'CELEBRATE',
  'GRATEFUL',
  'CONDOLENCE',
] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

export class ReactDto {
  @ApiProperty({
    enum: REACTION_TYPES,
    description: 'Type de réaction / Reaction type',
    example: 'LOVE',
  })
  @IsString()
  @IsIn(REACTION_TYPES)
  reactionType!: ReactionType;
}
