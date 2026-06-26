import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Optional parameters when requesting a join token for a live session.
 *
 * `requestSpeaker` lets a non-host ask for publish rights (e.g. a family
 * council where relatives speak). The server only honours it according to its
 * own role policy — the host always publishes; viewers default to
 * subscribe-only — so this is a request, never a guarantee.
 */
export class JoinLiveDto {
  @ApiPropertyOptional({
    description:
      'Request publish (speaker) rights rather than viewer-only / Demander le rôle d’intervenant',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requestSpeaker?: boolean;
}
