import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Body for `POST /admin/persons/force-merge` (SUPER_ADMIN only).
 *
 * Force-merge bypasses the MergeProposal queue: it should be reserved
 * for cleanup of obvious duplicates that no longer require community
 * review. The keeper absorbs the loser's relations and the loser is
 * soft-deleted in the same transaction.
 */
export class ForceMergeDto {
  @ApiProperty({
    description: 'Person to keep. All relations from the loser will be reassigned here.',
  })
  @IsUUID()
  keeperPersonId: string;

  @ApiProperty({
    description: 'Person to retire. Will be soft-deleted after relations are reassigned.',
  })
  @IsUUID()
  loserPersonId: string;

  @ApiProperty({
    description:
      'Mandatory rationale recorded in the admin audit trail (CRITICAL severity).',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;
}
