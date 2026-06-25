import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { VisibilityScope } from '@prisma/client';
import { GraphDegreeService, DEFAULT_MAX_DEGREE } from './graph-degree.service';
import {
  VISIBILITY_TARGET_KEY,
  VisibilityRequest,
  VisibilityTargetData,
  VisibilityTargetExtractor,
} from './visibility.decorator';

/**
 * Centralised authorization guard for the visibility model.
 *
 * Decision logic, given a target {@link VisibilityTargetData} and the
 * requesting account's personId:
 *   - PUBLIC       -> any authenticated user.
 *   - PRIVATE_SELF -> the owner only (requesterPersonId === ownerId).
 *   - FAMILY       -> the owner, OR anyone whose shortest family-graph degree
 *                     to the owner is <= visibleMaxDegree.
 *
 * The guard is a no-op on handlers without a @VisibilityTarget(...) so it is
 * safe to compose anywhere; it never widens access on its own.
 *
 * Must run AFTER an authentication guard (JwtAuthGuard) so request.user exists.
 */
@Injectable()
export class VisibilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly graphDegree: GraphDegreeService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const extractor = this.reflector.getAllAndOverride<
      VisibilityTargetExtractor | undefined
    >(VISIBILITY_TARGET_KEY, [context.getHandler(), context.getClass()]);

    // No target declared -> nothing for this guard to enforce.
    if (!extractor) {
      return true;
    }

    const request = context.switchToHttp().getRequest<VisibilityRequest>();
    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }

    const target = await extractor(request);
    // Deny without leaking existence (404-equivalent handled upstream if needed).
    if (!target) {
      throw new ForbiddenException('Content not accessible');
    }

    const allowed = await this.evaluate(target, request.user.personId ?? null);
    if (!allowed) {
      throw new ForbiddenException('Content not accessible');
    }
    return true;
  }

  /**
   * Pure-ish decision function (only side effect is the bounded graph read for
   * FAMILY). Exposed for direct unit testing and reuse by services that need
   * to filter collections rather than guard a single route.
   */
  async evaluate(
    target: VisibilityTargetData,
    requesterPersonId: string | null,
  ): Promise<boolean> {
    switch (target.visibilityScope) {
      case VisibilityScope.PUBLIC:
        // Authentication is enforced by canActivate / upstream guard.
        return true;

      case VisibilityScope.PRIVATE_SELF:
        if (!requesterPersonId || !target.ownerId) {
          return false;
        }
        return requesterPersonId === target.ownerId;

      case VisibilityScope.FAMILY: {
        if (!requesterPersonId || !target.ownerId) {
          return false;
        }
        // The owner always sees their own content.
        if (requesterPersonId === target.ownerId) {
          return true;
        }
        const maxDegree =
          target.visibleMaxDegree ??
          this.config.get<number>(
            'authorization.familyMaxDegree',
            DEFAULT_MAX_DEGREE,
          );
        const degree = await this.graphDegree.computeDegree(
          requesterPersonId,
          target.ownerId,
          maxDegree,
        );
        return degree !== null && degree <= maxDegree;
      }

      default:
        // Unknown scope -> fail closed.
        return false;
    }
  }
}
