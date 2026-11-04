import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/enums';

export const ROLES_KEY = 'roles';

// Giới hạn endpoint theo role, vd @Roles('ADMIN', 'STAFF'). Dùng cùng JwtAuthGuard + RolesGuard.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const ROLES_MESSAGE_KEY = 'rolesMessage';

// Tùy chọn: thông báo 403 riêng cho endpoint khi role không phù hợp (mặc định dùng câu chung của RolesGuard)
export const RolesMessage = (message: string) =>
  SetMetadata(ROLES_MESSAGE_KEY, message);
