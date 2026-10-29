import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '../generated/prisma/enums';
import { UsersService } from '../users/users.service';
import { MSG_ACCOUNT_LOCKED, MSG_INVALID_CREDENTIALS } from './auth.constants';
import type {
  AccessTokenPayload,
  AuthUser,
  RefreshTokenPayload,
} from './auth.types';
import { RegisterDto } from './dto/register.dto';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  // Thời điểm refresh token hết hạn, dùng làm `expires` của cookie
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  // Hash giả (cùng cost 10 với lúc tạo user) để vẫn tốn thời gian so sánh khi email không tồn tại,
  // tránh lộ email nào có trong hệ thống qua thời gian phản hồi.
  private readonly dummyHash = bcrypt.hashSync('dummy-password-for-timing', 10);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Đăng ký luôn tạo CUSTOMER; băm mật khẩu và kiểm tra trùng email (409) do UsersService.create đảm nhiệm.
  register(dto: RegisterDto) {
    return this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name ?? dto.email.split('@')[0],
      phone: dto.phone,
      role: Role.CUSTOMER,
    });
  }

  async validateUser(email: string, password: string): Promise<AuthUser> {
    const found = await this.usersService.findByEmailWithPassword(email);

    // Luôn gọi compare, kể cả khi không có user
    const matched = await bcrypt.compare(
      password,
      found?.password ?? this.dummyHash,
    );
    if (!found || !matched) {
      throw new UnauthorizedException(MSG_INVALID_CREDENTIALS);
    }
    // Chỉ báo "bị khóa" sau khi mật khẩu đúng, để người lạ không dò được tài khoản nào bị khóa
    if (!found.isActive) {
      throw new ForbiddenException(MSG_ACCOUNT_LOCKED);
    }
    // Bỏ password trước khi trả ra khỏi service
    return {
      id: found.id,
      email: found.email,
      name: found.name,
      phone: found.phone,
      avatarUrl: found.avatarUrl,
      role: found.role,
      isActive: found.isActive,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    };
  }

  // Cấp cặp access + refresh token mới (dùng cho cả login và refresh/xoay vòng)
  async issueTokens(
    user: Pick<AuthUser, 'id' | 'role'>,
  ): Promise<IssuedTokens> {
    const accessPayload: AccessTokenPayload = { sub: user.id, role: user.role };
    const refreshPayload: RefreshTokenPayload = { sub: user.id };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow('JWT_ACCESS_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    const decoded = this.jwtService.decode<{ exp: number }>(refreshToken);
    console.log('>>>check user: ', user);
    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: new Date(decoded.exp * 1000),
    };
  }
}
