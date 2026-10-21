import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { MSG_TOKEN_EXPIRED, MSG_UNAUTHORIZED } from '../auth.constants';
import type { AuthUser } from '../auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser = AuthUser>(
    err: unknown,
    user: TUser | false,
    info?: { name?: string },
  ): TUser {
    if (err || !user) {
      // Giữ lại thông điệp tiếng Việt, phân biệt hết hạn để frontend biết cần gọi /auth/refresh
      throw new UnauthorizedException(
        info?.name === 'TokenExpiredError'
          ? MSG_TOKEN_EXPIRED
          : MSG_UNAUTHORIZED,
      );
    }
    return user;
  }
}
