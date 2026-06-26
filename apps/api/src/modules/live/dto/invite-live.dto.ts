import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** E.164 phone shape reused across the platform (auth/invitations). */
const E164 = /^\+[1-9]\d{6,14}$/;

/** Bound the fan-out per single invite call (spam / DoS guard). */
const MAX_INVITEES_PER_CALL = 100;

/**
 * Invite relatives to a live session. The host may pick existing accounts from
 * the family graph (`accountIds`) AND/OR raw phone numbers (`phones`, E.164) for
 * relatives who are not on the platform yet (or whose account the host doesn't
 * know). At least one of the two lists must be non-empty (enforced in service,
 * with a bilingual error).
 *
 * Each invited account receives an in-app Notification ("X t'invite à un
 * direct"); each phone receives a WhatsApp/SMS push carrying the shareable
 * join-by-code link. Sending is idempotent per (session, account|phone).
 */
export class InviteLiveDto {
  @ApiPropertyOptional({
    description:
      'Account ids picked from the family graph / Identifiants de comptes choisis dans le graphe familial',
    type: [String],
    format: 'uuid',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_INVITEES_PER_CALL)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  accountIds?: string[];

  @ApiPropertyOptional({
    description:
      'Phone numbers in E.164 format for relatives off-platform / Numéros au format E.164 pour des proches hors plateforme',
    type: [String],
    example: ['+237691234567'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_INVITEES_PER_CALL)
  @ArrayUnique()
  @Matches(E164, {
    each: true,
    message: 'Each phone must be in E.164 format (e.g. +237691234567)',
  })
  phones?: string[];
}
