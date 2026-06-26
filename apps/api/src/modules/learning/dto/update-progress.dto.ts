import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload for updating an enrolled learner's progress on a lesson.
 *
 * `progressPercent` is clamped to 0..100 by validation; reaching 100 marks the
 * enrollment as completed (sets `completed_at`).
 */
export class UpdateProgressDto {
  @ApiProperty({
    description:
      'Completion progress for the lesson, 0..100 / Progression de la leçon (0 à 100)',
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent!: number;
}
