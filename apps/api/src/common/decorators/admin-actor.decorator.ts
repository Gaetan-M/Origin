import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AccountRole } from '@prisma/client';

export interface AdminActor {
  accountId: string;
  role: AccountRole;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
}

/**
 * Builds an AdminActor object from request.user + request headers,
 * ready to be passed to AdminAuditService.record().
 *
 * Usage:
 *   handler(@AdminActorCtx() actor: AdminActor) { ... }
 */
export const AdminActorCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminActor => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { id: string; role: AccountRole };
    const ipAddress =
      (req.headers['x-forwarded-for'] as string | undefined) ?? req.ip ?? null;
    const userAgent = (req.headers['user-agent'] as string | undefined) ?? null;
    const requestId =
      (req.headers['x-request-id'] as string | undefined) ?? null;
    return {
      accountId: user.id,
      role: user.role,
      ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : null,
      userAgent,
      requestId,
    };
  },
);
