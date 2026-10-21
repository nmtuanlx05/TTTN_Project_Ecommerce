import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Đánh dấu endpoint không cần đăng nhập (JwtAuthGuard bỏ qua khi guard được bật toàn cục).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
