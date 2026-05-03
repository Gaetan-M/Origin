import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

const ROLE_RANK: Record<AccountRole, number> = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

/**
 * Enforces the minimum role required by @Roles(...).
 *
 * Must run AFTER JwtAuthGuard so request.user is populated. Apply both
 * guards on the controller: `@UseGuards(JwtAuthGuard, RolesGuard)`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AccountRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles → no restriction beyond authentication.
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: AccountRole } | undefined;

    if (!user?.role) {
      throw new ForbiddenException('Role information missing on token');
    }

    // Pick the lowest required role as the floor — granting MODERATOR
    // does not bar an ADMIN from the same handler.
    const floor = Math.min(...required.map((r) => ROLE_RANK[r]));
    if (ROLE_RANK[user.role] < floor) {
      throw new ForbiddenException('Insufficient privileges');
    }

    return true;
  }
}
