import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentExpiryCron } from '../src/payments/payment-expiry.cron';
import { MediaCleanupCron } from '../src/media/media-cleanup.cron';

// Smoke test nạp AppModule THẬT nhưng KHÔNG chạm database:
//  1) biến môi trường giả, đặt TRƯỚC khi nạp AppModule (ép ghi đè, không phụ thuộc shell/.env);
//  2) PrismaService thay bằng bản giả -> constructor thật không chạy, không $connect;
//  3) hai cron thay bằng {} -> không đăng ký tác vụ định kỳ;
//  4) test khẳng định PrismaService đang là bản giả.
const JWT_SECRET = 'test-access-secret';
Object.assign(process.env, {
  DATABASE_URL: 'mysql://test:test@127.0.0.1:1/unreachable',
  JWT_ACCESS_SECRET: JWT_SECRET,
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_REFRESH_EXPIRES_IN: '7d',
});

describe('AppController (e2e, Prisma giả)', () => {
  let app: INestApplication<App>;
  const fakePrisma = {
    __isFake: true,
    user: { findUnique: jest.fn() },
  };

  beforeAll(async () => {
    // Nạp động để biến môi trường ở trên có hiệu lực trước khi ConfigModule.forRoot chạy.
    const { AppModule } = await import('../src/app.module');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .overrideProvider(PaymentExpiryCron)
      .useValue({})
      .overrideProvider(MediaCleanupCron)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('PrismaService là bản giả (không kết nối database)', () => {
    expect(app.get(PrismaService)).toBe(fakePrisma);
  });

  it('GET / không có token → 401 (JwtAuthGuard toàn cục)', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(401);
    expect((res.body as { success: boolean }).success).toBe(false);
  });

  it('GET / có JWT hợp lệ → 200 "Hello World!"', async () => {
    fakePrisma.user.findUnique.mockResolvedValue({
      id: 1,
      role: 'ADMIN',
      isActive: true,
    });
    const token = app
      .get(JwtService)
      .sign({ sub: 1, role: 'ADMIN' }, { secret: JWT_SECRET });

    const res = await request(app.getHttpServer())
      .get('/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    // getHello() hiện trả thêm dấu cách cuối (scaffold Nest); không sửa src nên so khớp theo nội dung.
    expect((res.body as { data: string }).data).toContain('Hello World!');
  });
});
