import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  EMAIL_JOB,
  EMAIL_QUEUE,
  REDIS_ERROR_LOG_INTERVAL_MS,
} from './queue.constants';
import { ThrottledErrorLogger } from './throttled-error-logger';

// WORKER: nhận job từ hàng đợi email và xử lý. Hiện chỉ biết job "ping"; job nghiệp vụ (mail) thêm ở PR sau.
// Chỉ được nạp khi QUEUE_WORKER_ENABLED khác 'false' (xem QueueWorkerModule).
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly throttled = new ThrottledErrorLogger(
    (message) => this.logger.error(`Lỗi kết nối Redis (worker): ${message}`),
    REDIS_ERROR_LOG_INTERVAL_MS,
  );

  process(job: Job): Promise<{ handledAt: string }> {
    switch (job.name) {
      case EMAIL_JOB.PING:
        this.logger.log(
          `Nhận job ping id=${job.id}: hàng đợi hoạt động bình thường`,
        );
        // Giá trị trả về được BullMQ lưu vào Redis (trường returnvalue của job) để xem bằng redis-cli
        return Promise.resolve({ handledAt: new Date().toISOString() });
      default:
        // Ném lỗi thì job được đánh dấu thất bại (và thử lại theo attempts) thay vì bị bỏ qua âm thầm
        return Promise.reject(
          new Error(`Loại job không được hỗ trợ: ${job.name}`),
        );
    }
  }

  // Worker có kết nối Redis riêng; không có listener thì BullMQ in thẳng mọi lỗi ra console khi Redis mất
  @OnWorkerEvent('error')
  onError(error: Error) {
    this.throttled.report(error);
  }
}
