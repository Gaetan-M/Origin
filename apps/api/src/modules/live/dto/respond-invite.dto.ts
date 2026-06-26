import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * An invitee's response to a live invitation. `accept = true` marks the
 * invitation ACCEPTED (the relative plans to attend and the host is notified);
 * `false` marks it DECLINED. Either way the row is stamped `responded_at`.
 */
export class RespondInviteDto {
  @ApiProperty({
    description:
      'Accept (true) or decline (false) the invitation / Accepter (true) ou décliner (false)',
  })
  @IsBoolean()
  accept!: boolean;
}
