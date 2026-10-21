import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MSG_TOKEN_EXPIRED, MSG_UNAUTHORIZED } from '../auth.constants';
import type { AuthUser } from '../auth.types';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  handleRequest<TUser = AuthUser>(
    err: unknown,
    user: TUser | false,
    info?: { name?: string },
  ): TUser {
    if (err || !user) {
      throw new UnauthorizedException(
        info?.name === 'TokenExpiredError'
          ? MSG_TOKEN_EXPIRED
          : MSG_UNAUTHORIZED,
      );
    }
    return user;
  }
}
