// Khởi động với QueueModule THẬT nhưng Redis "chết" (cổng 1 không ai nghe): app phải dừng nhanh, báo rõ cách sửa.
// Đây cũng là bằng chứng forRootAsync đọc REDIS_URL từ ConfigService: EmailQueueService nêu đúng host:cổng này trong lỗi.
// Không cần Redis thật. Mọi kết nối được đóng ở afterEach để Jest không bị treo vì ioredis tự nối lại.
import type { TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { EmailQueueService } from '../src/queue/email-queue.service';
import { QueueModule } from '../src/queue/queue.module';

describe('Khởi động khi Redis không chạy (QueueModule thật)', () => {
  const SAVED = { ...process.env };
  let moduleRef: TestingModule | undefined;

  beforeAll(() => {
    process.env.REDIS_URL = 'redis://:hunter2@127.0.0.1:1';
    delete process.env.REDIS_PASSWORD;
    delete process.env.QUEUE_PREFIX;
  });

  afterEach(async () => {
    // Đóng module (không phải app) để chắc chắn đóng Queue và ngắt kết nối ioredis đang tự nối lại
    await moduleRef?.close();
    moduleRef = undefined;
  });

  afterAll(() => {
    process.env = SAVED;
  });

  async function createApp() {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        QueueModule,
      ],
    }).compile();
    return moduleRef;
  }

  it('checkConnection(300ms) báo lỗi tiếng Việt kèm cách sửa, không lộ mật khẩu', async () => {
    const ref = await createApp();
    const service = ref.get(EmailQueueService);

    const started = Date.now();
    const error = await service.checkConnection(300).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain('127.0.0.1:1');
    expect(message).toContain('npm run db:up');
    expect(message).toContain('REDIS_URL');
    expect(message).not.toContain('hunter2');
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it('app.init() thất bại sau ~5 giây (mặc định) vì onModuleInit ném lỗi', async () => {
    const ref = await createApp();
    const app = ref.createNestApplication();

    const started = Date.now();
    await expect(app.init()).rejects.toThrow(/Không dùng được Redis/);
    const elapsed = Date.now() - started;

    expect(elapsed).toBeGreaterThanOrEqual(4500);
    expect(elapsed).toBeLessThan(9000);
  }, 20_000);
});
