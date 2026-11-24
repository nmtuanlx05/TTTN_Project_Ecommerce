// Chứng minh nền hàng đợi hoạt động mà KHÔNG cần Redis:
//  1) overrideModule(QueueModule).useModule(FakeQueueModule) thay được module thật (QueueModule là class tĩnh)
//  2) QUEUE_WORKER_ENABLED bật/tắt EmailProcessor trong AppModule thật
import { Test } from '@nestjs/testing';
import { EmailQueueService } from '../src/queue/email-queue.service';
import { QueueModule } from '../src/queue/queue.module';
import {
  FakeEmailQueueService,
  FakeQueueModule,
  NoopQueueWorkerModule,
} from './shims/fake-queue.module';

describe('Nền hàng đợi (không cần Redis)', () => {
  describe('overrideModule(QueueModule) khớp bằng ===', () => {
    it('bản giả thay được bản thật và ghi lại yêu cầu', async () => {
      // Không nạp ConfigModule, không có REDIS_URL: nếu QueueModule thật vẫn được dùng thì compile() sẽ lỗi
      const moduleRef = await Test.createTestingModule({
        imports: [QueueModule],
      })
        .overrideModule(QueueModule)
        .useModule(FakeQueueModule)
        .compile();

      const service = moduleRef.get(EmailQueueService);
      expect(service).toBeInstanceOf(FakeEmailQueueService);

      await service.addPing();
      expect(moduleRef.get(FakeEmailQueueService).jobs).toEqual([
        { type: 'ping' },
      ]);
      await moduleRef.close();
    });
  });

  describe('QUEUE_WORKER_ENABLED bật/tắt worker', () => {
    const SAVED = process.env.QUEUE_WORKER_ENABLED;

    afterEach(() => {
      if (SAVED === undefined) delete process.env.QUEUE_WORKER_ENABLED;
      else process.env.QUEUE_WORKER_ENABLED = SAVED;
      jest.resetModules();
    });

    // Điều kiện nạp worker được tính lúc nạp file app.module, nên phải nạp lại toàn bộ module tree cho mỗi lần thử.
    // Mọi class lấy từ CÙNG một lần nạp (registry mới) để so khớp token đúng.
    async function buildApp(workerEnv: string | undefined) {
      jest.resetModules();
      if (workerEnv === undefined) delete process.env.QUEUE_WORKER_ENABLED;
      else process.env.QUEUE_WORKER_ENABLED = workerEnv;
      Object.assign(process.env, {
        DATABASE_URL: 'mysql://test:test@127.0.0.1:1/unreachable',
        JWT_ACCESS_SECRET: 'a',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'b',
        JWT_REFRESH_EXPIRES_IN: '7d',
        REDIS_URL: 'redis://127.0.0.1:1',
        MAIL_HOST: '127.0.0.1',
        MAIL_PORT: '1025',
        MAIL_FROM: 'no-reply@example.com',
        FRONTEND_URL: 'http://localhost:5173',
      });

      const { Test: FreshTest } = await import('@nestjs/testing');
      const { AppModule } = await import('../src/app.module');
      const { PrismaService } = await import('../src/prisma/prisma.service');
      const { PaymentExpiryCron } =
        await import('../src/payments/payment-expiry.cron');
      const { MediaCleanupCron } =
        await import('../src/media/media-cleanup.cron');
      const { QueueModule: FreshQueueModule } =
        await import('../src/queue/queue.module');
      const { EmailProcessor } = await import('../src/queue/email.processor');
      const { FakeQueueModule: FreshFake } =
        await import('./shims/fake-queue.module');

      const moduleRef = await FreshTest.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue({})
        .overrideProvider(PaymentExpiryCron)
        .useValue({})
        .overrideProvider(MediaCleanupCron)
        .useValue({})
        .overrideModule(FreshQueueModule)
        .useModule(FreshFake)
        .compile();
      return { moduleRef, EmailProcessor };
    }

    it.each([
      ['không đặt biến', undefined],
      ['true', 'true'],
    ])('%s → có EmailProcessor', async (_label, value) => {
      const { moduleRef, EmailProcessor } = await buildApp(value);
      expect(moduleRef.get(EmailProcessor, { strict: false })).toBeDefined();
      await moduleRef.close();
    });

    it('false → không có EmailProcessor', async () => {
      const { moduleRef, EmailProcessor } = await buildApp('false');
      expect(() => moduleRef.get(EmailProcessor, { strict: false })).toThrow();
      await moduleRef.close();
    });
  });

  it('NoopQueueWorkerModule là module rỗng (dự phòng khi override worker)', () => {
    expect(NoopQueueWorkerModule).toBeDefined();
  });
});
