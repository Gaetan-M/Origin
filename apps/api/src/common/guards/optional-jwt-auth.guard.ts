import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T>(err: Error | null, user: T): T | null {
    // Don't throw on missing/invalid token, just return null
    if (err || !user) {
      return null as T;
    }
    return user;
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    return super.canActivate(context) as boolean | Promise<boolean>;
  }
}
