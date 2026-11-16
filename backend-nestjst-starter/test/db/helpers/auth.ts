import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DB_TEST_JWT_SECRET } from '../setup-env';

export type TestRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

// Ký access token GIẢ bằng secret giả của bộ test (setup-env.ts). JwtStrategy vẫn đọc lại user từ DB thật,
// nên user phải được tạo trước bằng factories (id và isActive lấy từ DB).
export function createTokenSigner(app: INestApplication) {
  const jwt = app.get(JwtService);
  return (userId: number, role: TestRole = 'CUSTOMER'): string =>
    jwt.sign({ sub: userId, role }, { secret: DB_TEST_JWT_SECRET });
}
