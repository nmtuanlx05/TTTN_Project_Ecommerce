// Thử nhanh hàng đợi: đặt MỘT job "ping" vào hàng đợi email rồi thoát. Chạy tay:
//   npm run queue:ping
// Chỉ nạp ConfigModule + QueueModule (phía ĐẶT job): không HTTP, không Prisma, không worker.
// Việc XỬ LÝ job là của worker trong tiến trình `npm run dev` (nếu đang chạy và QUEUE_WORKER_ENABLED không phải false).
// Mã thoát: 0 = đã đặt job; 1 = Redis không dùng được hoặc cấu hình sai.
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ENV_FILE } from '../src/config/env-file';
import { EmailQueueService } from '../src/queue/email-queue.service';
import { readQueueConfig } from '../src/queue/queue.config';
import { EMAIL_QUEUE } from '../src/queue/queue.constants';
import { QueueModule } from '../src/queue/queue.module';

// Thời gian chờ RIÊNG của script (không dựa vào mức 5 giây trong EmailQueueService): quá hạn là bỏ cuộc và thoát mã 1.
const SCRIPT_TIMEOUT_MS = 8000;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ENV_FILE }),
    QueueModule,
  ],
})
class QueuePingModule {}

// Đua một công việc với bộ đếm giờ; luôn hủy bộ đếm để tiến trình thoát được ngay khi xong.
async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Quá ${ms / 1000} giây mà Redis chưa phản hồi.`)),
      ms,
    );
  });
  work.catch(() => undefined); // nếu bộ đếm thắng thì lỗi muộn của công việc không thành unhandled rejection
  try {
    return await Promise.race([work, timedOut]);
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const app = await withTimeout(
    // init() của EmailQueueService đã tự kiểm Redis (5 giây); hàng rào 8 giây này là lớp an toàn của riêng script
    NestFactory.createApplicationContext(QueuePingModule, {
      logger: ['error', 'warn'],
    }),
    SCRIPT_TIMEOUT_MS,
  );
  try {
    const jobId = await withTimeout(
      app.get(EmailQueueService).addPing(),
      SCRIPT_TIMEOUT_MS,
    );
    const { prefix, connection } = readQueueConfig((key) =>
      app.get(ConfigService).get<string>(key),
    );

    console.log(`Đã đặt job ping vào hàng đợi "${EMAIL_QUEUE}", id = ${jobId}`);
    console.log('');
    console.log('Xem kết quả:');
    console.log(
      '  1) Terminal đang chạy "npm run dev": phải thấy dòng "Nhận job ping id=' +
        jobId +
        '" (cần worker bật).',
    );
    // Tiền tố lấy từ QUEUE_PREFIX (mặc định "ecommerce"); khóa của job là <tiền tố>:<tên hàng đợi>:<id>
    console.log('  2) Xem job trong Redis:');
    const auth = connection.password ? ' -a "$REDIS_PASSWORD"' : '';
    console.log(
      `     docker exec -it ecommerce_redis redis-cli${auth} hgetall ${prefix}:${EMAIL_QUEUE}:${jobId}`,
    );
    console.log(
      '     (có finishedOn và returnvalue = đã xử lý; không có = đang chờ worker)',
    );
    console.log(
      '     Lưu ý: job xong chỉ được giữ 1 giờ rồi tự dọn, nên hgetall sau đó sẽ trả rỗng.',
    );
  } finally {
    // Đóng hàng đợi/kết nối để tiến trình tự thoát sạch, không cần process.exit
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(
    'Không đặt được job ping: ' +
      (error instanceof Error ? error.message : String(error)),
  );
  // Kết nối ioredis vẫn đang thử nối lại nên tiến trình sẽ không tự thoát; phải thoát cứng với mã 1
  process.exit(1);
});
