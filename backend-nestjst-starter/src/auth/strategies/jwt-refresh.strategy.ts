import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { MSG_UNAUTHORIZED, REFRESH_COOKIE_NAME } from '../auth.constants';
import type { AuthUser, RefreshTokenPayload } from '../auth.types';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // Refresh token nằm trong cookie httpOnly, không đọc từ header
      jwtFromRequest: (req: Request) =>
        (req?.cookies as Record<string, string> | undefined)?.[
          REFRESH_COOKIE_NAME
        ] ?? null,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: RefreshTokenPayload): Promise<AuthUser> {
    const user = await this.usersService.findForAuth(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(MSG_UNAUTHORIZED);
    }
    return user;
  }
}
