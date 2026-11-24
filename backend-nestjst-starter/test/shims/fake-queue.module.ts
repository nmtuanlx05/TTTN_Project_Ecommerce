import { Module } from '@nestjs/common';
import { EmailQueueService } from '../../src/queue/email-queue.service';

// Việc đã được "đặt" vào hàng đợi giả: chỉ ghi lại YÊU CẦU GÌ (loại việc + dữ liệu truyền vào).
// Không có jobId: jobId do EmailQueueService thật quyết định và sẽ có test riêng khi có job nghiệp vụ.
export interface RecordedJob {
  type: 'ping';
  data?: undefined;
}

// `implements Pick<...>`: bản thật đổi/xóa/thêm hàm công khai mà bản giả không theo thì TypeScript báo lỗi biên dịch ngay
// (ESLint/build/ts-jest), thay vì để test xanh giả với một bản giả đã lệch.
export class FakeEmailQueueService implements Pick<
  EmailQueueService,
  'checkConnection' | 'addPing'
> {
  readonly jobs: RecordedJob[] = [];

  async checkConnection() {
    // Không có Redis nào để kiểm
  }

  addPing() {
    this.jobs.push({ type: 'ping' });
    return Promise.resolve(undefined);
  }
}

// Thay QueueModule thật bằng overrideModule(QueueModule).useModule(FakeQueueModule): không mở kết nối Redis nào.
@Module({
  providers: [
    FakeEmailQueueService,
    { provide: EmailQueueService, useExisting: FakeEmailQueueService },
  ],
  exports: [EmailQueueService, FakeEmailQueueService],
})
export class FakeQueueModule {}

// Thay QueueWorkerModule khi cần chắc chắn không có worker nào chạy (dự phòng cho QUEUE_WORKER_ENABLED=false)
@Module({})
export class NoopQueueWorkerModule {}
