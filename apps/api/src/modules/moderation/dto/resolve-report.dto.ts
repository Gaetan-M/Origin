import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Terminal states a moderator may move a report into.
 * RESOLVED = action was taken; DISMISSED = no action needed.
 */
export type ResolveReportStatus = 'RESOLVED' | 'DISMISSED';

/**
 * Body for `POST /moderation/reports/:id/resolve`.
 */
export class ResolveReportDto {
  @ApiProperty({
    enum: ['RESOLVED', 'DISMISSED'] as const,
    description: 'Final state of the report.',
  })
  @IsIn(['RESOLVED', 'DISMISSED'])
  status: ResolveReportStatus;

  @ApiPropertyOptional({
    description: 'Moderator note explaining the resolution.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string;
}
