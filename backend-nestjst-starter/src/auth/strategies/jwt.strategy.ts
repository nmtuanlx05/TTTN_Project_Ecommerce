import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { MSG_UNAUTHORIZED } from '../auth.constants';
import type { AccessTokenPayload, AuthUser } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      ignoreExpiration: false,
    });
  }

  // Luôn đọc lại user từ DB: khóa tài khoản hoặc đổi role có hiệu lực ngay, không đợi token hết hạn.
  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    const user = await this.usersService.findForAuth(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(MSG_UNAUTHORIZED);
    }
    return user;
  }
}
