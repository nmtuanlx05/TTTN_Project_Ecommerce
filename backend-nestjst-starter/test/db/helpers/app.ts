import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/app.setup';
import { MediaCleanupCron } from '../../../src/media/media-cleanup.cron';
import { OrdersService } from '../../../src/orders/orders.service';
import { PaymentExpiryCron } from '../../../src/payments/payment-expiry.cron';
import { EmailQueueService } from '../../../src/queue/email-queue.service';
import { QueueModule } from '../../../src/queue/queue.module';
import { QueueWorkerModule } from '../../../src/queue/queue-worker.module';
import {
  FakeEmailQueueService,
  FakeQueueModule,
  NoopQueueWorkerModule,
} from '../../shims/fake-queue.module';
import { createTokenSigner, TestRole } from './auth';
import { getTestDatabaseUrl } from './prisma-client';

// AppModule THẬT (PrismaService thật nối vào DB test, pool 10 kết nối như production), lắng nghe cổng ngẫu nhiên.
// Lắng nghe thật rồi gọi qua URL (thay vì request(app.getHttpServer())) để bắn nhiều request ĐỒNG THỜI an toàn:
// supertest tự mở/đóng server cho từng request và có thể đóng nhầm server khi nhiều request chạy song song.
export interface TestApp {
  app: INestApplication;
  baseUrl: string;
  tokenFor(userId: number, role?: TestRole): string;
  // Hàng đợi email giả DÙNG CHUNG cho cả app: test đọc/làm rỗng `emailQueue.jobs`
  emailQueue: FakeEmailQueueService;
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
    // Hàng đợi giả: test:db không cần Redis. overrideModule(QueueWorkerModule) dự phòng cho QUEUE_WORKER_ENABLED=false (setup-env.ts)
    .overrideModule(QueueModule)
    .useModule(FakeQueueModule)
    .overrideModule(QueueWorkerModule)
    .useModule(NoopQueueWorkerModule)
    .compile();

  // Chốt chặn thường trực: override hỏng thì dừng ngay, không để test lặng lẽ nối Redis thật
  const emailQueue = moduleRef.get(FakeEmailQueueService);
  const provided: unknown = moduleRef.get(EmailQueueService);
  if (provided !== emailQueue) {
    throw new Error(
      'EmailQueueService trong test:db phải là FakeEmailQueueService',
    );
  }
  // OrdersService import QueueModule riêng: kiểm instance THẬT SỰ được inject vào nó chính là bản giả mà test đọc
  // (đọc trường private theo tên; đổi tên trường thì chốt này báo lỗi chứ không lặng lẽ bỏ qua)
  const injected = moduleRef.get<OrdersService, { emailQueue?: unknown }>(
    OrdersService,
  ).emailQueue;
  if (injected !== emailQueue) {
    throw new Error(
      'OrdersService trong test:db phải dùng đúng FakeEmailQueueService của test',
    );
  }

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.listen(0);
  const server = app.getHttpServer() as Server;
  const port = (server.address() as AddressInfo).port;

  return {
    app,
    baseUrl: `http://127.0.0.1:${port}`,
    tokenFor: createTokenSigner(app),
    emailQueue,
    close: () => app.close(),
  };
}
