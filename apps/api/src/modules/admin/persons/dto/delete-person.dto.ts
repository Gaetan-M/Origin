import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for `DELETE /admin/persons/:id`.
 *
 * Reason is mandatory: a soft-delete is a destructive moderation action
 * that must be justified for downstream audit review (we never hard-delete).
 */
export class DeletePersonDto {
  @ApiProperty({
    description: 'Mandatory rationale recorded in the admin audit trail.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;
}
