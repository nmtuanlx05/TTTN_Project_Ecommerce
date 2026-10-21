import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/enums';

export const ROLES_KEY = 'roles';

// Giới hạn endpoint theo role, vd @Roles('ADMIN', 'STAFF'). Dùng cùng JwtAuthGuard + RolesGuard.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
