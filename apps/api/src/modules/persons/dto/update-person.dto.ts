import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePersonDto } from './create-person.dto';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LifeStatus } from '@prisma/client';

// `isSelf` and `names` are intentionally stripped from updates: a user must
// not be able to flip the auto-claim flag on someone else's fiche, and names
// have a dedicated update flow. `forbidNonWhitelisted` in main.ts ensures any
// other unknown property (verificationLevel, claimedByAccountId, etc.) is
// rejected before reaching the service.
export class UpdatePersonDto extends PartialType(
  OmitType(CreatePersonDto, ['isSelf', 'names'] as const),
) {
  @ApiProperty({ enum: LifeStatus })
  @IsEnum(LifeStatus)
  lifeStatus: LifeStatus;
}
