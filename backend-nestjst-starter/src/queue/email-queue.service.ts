import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  EMAIL_JOB,
  EMAIL_QUEUE,
  REDIS_ERROR_LOG_INTERVAL_MS,
  REDIS_STARTUP_TIMEOUT_MS,
} from './queue.constants';
import { readQueueConfig } from './queue.config';
import { ThrottledErrorLogger } from './throttled-error-logger';

// CỬA DUY NHẤT để đặt job vào hàng đợi email: module nghiệp vụ (đơn hàng, đăng ký...) sau này chỉ inject
// class này, không đụng trực tiếp tới Queue của BullMQ. Test thay cả class bằng FakeEmailQueueService.
@Injectable()
export class EmailQueueService implements OnModuleInit {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {
    // Gắn listener 'error' ngay từ constructor. Không có listener thì BullMQ tự console.error mọi lỗi kết nối
    // (khi Redis mất là hàng loạt dòng); có listener thì ta kiểm soát được tần suất log.
    const throttled = new ThrottledErrorLogger(
      (message) => this.logger.error(`Lỗi kết nối Redis: ${message}`),
      REDIS_ERROR_LOG_INTERVAL_MS,
    );
    this.queue.on('error', (error) => throttled.report(error));
  }

  // Nest gọi hàm này khi khởi động. Ném lỗi ở đây thì app dừng với mã thoát 1, thay vì chạy mà không có hàng đợi.
  async onModuleInit() {
    await this.checkConnection();
    this.logger.log('Đã kết nối Redis, hàng đợi email sẵn sàng');
  }

  // Kiểm Redis thật sự sống (nối được và trả lời). waitUntilReady chờ vô hạn nếu Redis không tới
  // (ioredis cứ thử nối lại), nên đua với bộ đếm giờ. Thời gian chờ truyền được để test dùng giá trị ngắn.
  async checkConnection(timeoutMs: number = REDIS_STARTUP_TIMEOUT_MS) {
    let timer: NodeJS.Timeout | undefined;
    const timedOut = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    });
    const ready = this.queue.waitUntilReady();
    // Nếu bộ đếm giờ thắng thì `ready` bị bỏ lại; chặn lỗi muộn của nó trở thành unhandled rejection
    ready.catch(() => undefined);

    try {
      await Promise.race([ready, timedOut]);
    } catch (error) {
      const reason =
        error instanceof Error && error.message !== 'TIMEOUT'
          ? `Redis báo lỗi: ${error.message}.`
          : `Không kết nối được trong ${timeoutMs / 1000} giây.`;
      throw new Error(
        `Không dùng được Redis (${this.describeTarget()}). ${reason} ` +
          'Hãy kiểm tra Redis đang chạy (môi trường dev: chạy "npm run db:up" hoặc "docker compose up -d redis"), ' +
          'REDIS_URL trỏ đúng máy chủ/cổng, và REDIS_PASSWORD đúng nếu Redis có mật khẩu.',
        { cause: error },
      );
    } finally {
      clearTimeout(timer);
    }
  }

  // Job thử nghiệm: chỉ để kiểm hạ tầng hàng đợi chạy thông (worker nhận được và ghi log), không gửi mail.
  // Trả về id job (BullMQ tự sinh).
  async addPing(): Promise<string | undefined> {
    const job = await this.queue.add(EMAIL_JOB.PING, {
      requestedAt: new Date().toISOString(),
    });
    return job.id;
  }

  // Chỉ máy chủ:cổng, KHÔNG BAO GIỜ in URL/mật khẩu
  private describeTarget() {
    const { host, port } = readQueueConfig((key) =>
      this.config.get<string>(key),
    ).connection;
    return `${host}:${port}`;
  }
}
