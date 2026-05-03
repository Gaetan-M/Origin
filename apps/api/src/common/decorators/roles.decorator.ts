import { SetMetadata } from '@nestjs/common';
import { AccountRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restrict a controller or handler to one or more roles.
 *
 * Roles are checked with a "minimum-rank" semantic: any role passed in
 * acts as a floor — a SUPER_ADMIN always satisfies @Roles(MODERATOR).
 * The actual rank check lives in RolesGuard.
 */
export const Roles = (...roles: AccountRole[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
