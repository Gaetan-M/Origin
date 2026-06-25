import { SetMetadata } from '@nestjs/common';
import { AccountRole, VisibilityScope } from '@prisma/client';

export const VISIBILITY_TARGET_KEY = 'visibility_target';

/**
 * The minimal shape of a content entity the VisibilityGuard needs in order to
 * decide access. `ownerId` is the owner's *personId* (the node used for
 * family-graph degree computation), NOT an account id.
 */
export interface VisibilityTargetData {
  ownerId: string | null;
  visibilityScope: VisibilityScope;
  visibleMaxDegree: number | null;
}

/** The authenticated principal as populated by JwtStrategy + (optionally) a personId resolver. */
export interface VisibilityRequestUser {
  id: string;
  role?: AccountRole;
  /** The person node this account is claimed as. Required to evaluate FAMILY/PRIVATE_SELF. */
  personId?: string | null;
}

export interface VisibilityRequest {
  user?: VisibilityRequestUser;
  params?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Extractor that resolves the target content's visibility metadata from the
 * incoming request. Returning `null` signals "target not found" and the guard
 * will deny access without leaking existence.
 */
export type VisibilityTargetExtractor = (
  request: VisibilityRequest,
) => VisibilityTargetData | null | Promise<VisibilityTargetData | null>;

/**
 * Marks a route handler (or controller) with a strategy for obtaining the
 * visibility metadata of the content being accessed. The VisibilityGuard reads
 * this metadata, runs the extractor, then enforces scope + degree.
 *
 * @example
 *   @VisibilityTarget(async (req) => {
 *     const media = await mediaService.findRaw(req.params.id);
 *     return media && {
 *       ownerId: media.ownerPersonId,
 *       visibilityScope: media.visibilityScope,
 *       visibleMaxDegree: media.visibleMaxDegree,
 *     };
 *   })
 *   @UseGuards(JwtAuthGuard, VisibilityGuard)
 *   @Get(':id')
 *   getMedia() { ... }
 */
export const VisibilityTarget = (
  extractor: VisibilityTargetExtractor,
): ReturnType<typeof SetMetadata> =>
  SetMetadata(VISIBILITY_TARGET_KEY, extractor);
