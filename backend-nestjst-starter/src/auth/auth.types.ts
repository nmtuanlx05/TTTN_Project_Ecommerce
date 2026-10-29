import { Role } from '../generated/prisma/enums';

// Payload access token
export interface AccessTokenPayload {
  sub: number;
  role: Role;
}

// Payload refresh token (không cần role: lúc refresh luôn đọc lại user từ DB)
export interface RefreshTokenPayload {
  sub: number;
}

// User an toàn (không có password) được gắn vào req.user sau khi xác thực
export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
