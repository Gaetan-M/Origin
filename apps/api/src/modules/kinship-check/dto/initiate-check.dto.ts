import { IsString, IsOptional, IsUUID, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Initiates a consent-based kinship check.
 *
 * Exactly ONE of `targetPhone`, `targetAccountId` or `familyCode` identifies
 * who the requester wants to check kinship with. The service enforces the
 * "exactly one" rule (a DTO cannot express that constraint alone).
 *
 * PRIVACY: nothing here reveals the graph. The target is only ever told that
 * "someone wants to check kinship"; the requester learns only the aggregate
 * relationship result, and only after the target consents.
 */
export class InitiateCheckDto {
  @ApiPropertyOptional({
    example: '+237690000000',
    description:
      'Phone number (E.164) of the person to check kinship with. Mutually exclusive with targetAccountId / familyCode.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 format (e.g. +237690000000)',
  })
  targetPhone?: string;

  @ApiPropertyOptional({
    description:
      'Account id of the person to check kinship with. Mutually exclusive with targetPhone / familyCode.',
  })
  @IsOptional()
  @IsUUID()
  targetAccountId?: string;

  @ApiPropertyOptional({
    example: 'ORIGIN-7F3K9',
    description:
      'An existing reusable family invite code. Resolves to the code owner. Mutually exclusive with targetPhone / targetAccountId.',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  familyCode?: string;
}
