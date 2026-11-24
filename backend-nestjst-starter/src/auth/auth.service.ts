import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '../generated/prisma/enums';
import { EmailQueueService } from '../queue/email-queue.service';
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
  private readonly logger = new Logger(AuthService.name);

  // Hash giả (cùng cost 10 với lúc tạo user) để vẫn tốn thời gian so sánh khi email không tồn tại,
  // tránh lộ email nào có trong hệ thống qua thời gian phản hồi.
  private readonly dummyHash = bcrypt.hashSync('dummy-password-for-timing', 10);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  // Đăng ký luôn tạo CUSTOMER; băm mật khẩu và kiểm tra trùng email (409) do UsersService.create đảm nhiệm.
  async register(dto: RegisterDto) {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name ?? dto.email.split('@')[0],
      phone: dto.phone,
      role: Role.CUSTOMER,
    });
    this.queueWelcomeMail(user.id);
    return user;
  }

  // Mail chào mừng: đặt job SAU khi user đã lưu DB, kiểu "bắn rồi quên". Lỗi hàng đợi/Redis chỉ được ghi log (mã lỗi),
  // KHÔNG được làm hỏng đăng ký. Cố ý chỉ hook ở đây, không hook ở UsersService.create (Admin tạo user cũng gọi hàm đó).
  private queueWelcomeMail(userId: number) {
    try {
      void this.emailQueue
        .addWelcome(userId)
        .catch((error: unknown) => this.logWelcomeFailure(userId, error));
    } catch (error) {
      // addWelcome ném lỗi đồng bộ (không phải promise reject)
      this.logWelcomeFailure(userId, error);
    }
  }

  // Chỉ ghi mã lỗi đã lọc, không ghi message thô (có thể chứa địa chỉ máy chủ hay mật khẩu) và không ghi email
  private logWelcomeFailure(userId: number, error: unknown) {
    const code = (error as { code?: unknown } | null)?.code;
    const safeCode =
      typeof code === 'string' && /^[A-Z][A-Z0-9_]{1,30}$/.test(code)
        ? code
        : 'UNKNOWN';
    this.logger.warn(
      `Không đặt được job mail chào mừng cho userId=${userId} (code=${safeCode}); đăng ký vẫn thành công`,
    );
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
    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: new Date(decoded.exp * 1000),
    };
  }
}
