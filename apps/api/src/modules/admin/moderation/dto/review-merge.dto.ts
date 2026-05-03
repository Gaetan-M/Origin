import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for `POST /admin/moderation/merges/:id/approve`.
 *
 * `keeperPersonId` MUST be either `personAId` or `personBId` of the
 * proposal. The service enforces it and rejects mismatches with a
 * BadRequestException.
 */
export class ApproveMergeDto {
  @ApiProperty({
    description:
      'Person to keep. Must be either personAId or personBId of the proposal.',
  })
  @IsUUID()
  keeperPersonId: string;

  @ApiPropertyOptional({
    description: 'Optional rationale stored in the audit trail.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

/**
 * Body for `POST /admin/moderation/merges/:id/reject`.
 */
export class RejectMergeDto {
  @ApiProperty({ description: 'Reason recorded with the rejection.' })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;
}
