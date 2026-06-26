import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Moderation verdict for a piece of cultural content. Maps directly onto
 * the terminal values of the Prisma `ModerationStatus` enum.
 */
export type ContentModerationDecision = 'APPROVED' | 'REJECTED';

/**
 * Body for `POST /moderation/cultural-content/:id/moderate`.
 */
export class ModerateContentDto {
  @ApiProperty({
    enum: ['APPROVED', 'REJECTED'] as const,
    description: 'Approve to publish, or reject to keep it out of the feed.',
  })
  @IsIn(['APPROVED', 'REJECTED'])
  decision: ContentModerationDecision;

  @ApiPropertyOptional({
    description: 'Optional reason recorded in the audit trail.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
