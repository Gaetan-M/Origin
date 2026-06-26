import { BadRequestException } from '@nestjs/common';
import { EngagementTargetType } from '@prisma/client';

/** Path-style target type discriminators exposed in the REST contract. */
export const ENGAGEMENT_TARGET_PARAMS = [
  'tourism-place',
  'cultural-content',
] as const;

export type EngagementTargetParam = (typeof ENGAGEMENT_TARGET_PARAMS)[number];

const PARAM_TO_ENUM: Record<EngagementTargetParam, EngagementTargetType> = {
  'tourism-place': EngagementTargetType.TOURISM_PLACE,
  'cultural-content': EngagementTargetType.CULTURAL_CONTENT,
};

/**
 * Maps a `:targetType` path param (or batch body field) to the Prisma enum.
 * Throws 400 on any unknown discriminator.
 */
export function parseTargetType(raw: string): EngagementTargetType {
  const mapped = PARAM_TO_ENUM[raw as EngagementTargetParam];
  if (!mapped) {
    throw new BadRequestException(
      `Unknown target type "${raw}". Expected one of: ${ENGAGEMENT_TARGET_PARAMS.join(', ')}`,
    );
  }
  return mapped;
}
