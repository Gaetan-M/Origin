import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const MODERATION_DECISIONS = ['APPROVE', 'REJECT'] as const;
export type ModerationDecision = (typeof MODERATION_DECISIONS)[number];

export class ModerateDto {
  @ApiProperty({ enum: MODERATION_DECISIONS, description: 'Decision / Décision' })
  @IsIn(MODERATION_DECISIONS)
  decision!: ModerationDecision;
}
