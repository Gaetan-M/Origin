import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * The target's explicit decision on a pending kinship check.
 *
 * `consent = true`  -> the target agrees; once both parties consent the system
 *                      computes the relationship through the global graph.
 * `consent = false` -> the target declines; the check is closed and NOTHING is
 *                      ever computed.
 */
export class RespondCheckDto {
  @ApiProperty({
    example: true,
    description:
      'Whether the target consents to the kinship computation. false closes the check with no computation.',
  })
  @IsBoolean()
  consent: boolean;
}
