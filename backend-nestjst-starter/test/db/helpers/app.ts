import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/app.setup';
import { MediaCleanupCron } from '../../../src/media/media-cleanup.cron';
import { PaymentExpiryCron } from '../../../src/payments/payment-expiry.cron';
import { createTokenSigner, TestRole } from './auth';
import { getTestDatabaseUrl } from './prisma-client';

// AppModule THẬT (PrismaService thật nối vào DB test, pool 10 kết nối như production), lắng nghe cổng ngẫu nhiên.
// Lắng nghe thật rồi gọi qua URL (thay vì request(app.getHttpServer())) để bắn nhiều request ĐỒNG THỜI an toàn:
// supertest tự mở/đóng server cho từng request và có thể đóng nhầm server khi nhiều request chạy song song.
export interface TestApp {
  app: INestApplication;
  baseUrl: string;
  tokenFor(userId: number, role?: TestRole): string;
  close(): Promise<void>;
}

export async function startTestApp(): Promise<TestApp> {
  getTestDatabaseUrl(); // chốt chặn: dừng trước khi AppModule kịp nối DB

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    // Hai tác vụ định kỳ bị thay bằng {} để không tự chạy ngầm (hủy đơn hết hạn, dọn ảnh) trong lúc test
    .overrideProvider(PaymentExpiryCron)
    .useValue({})
    .overrideProvider(MediaCleanupCron)
    .useValue({})
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.listen(0);
  const server = app.getHttpServer() as Server;
  const port = (server.address() as AddressInfo).port;

  return {
    app,
    baseUrl: `http://127.0.0.1:${port}`,
    tokenFor: createTokenSigner(app),
    close: () => app.close(),
  };
}
