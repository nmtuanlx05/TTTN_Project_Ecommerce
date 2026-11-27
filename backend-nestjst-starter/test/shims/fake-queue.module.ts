import { Module } from '@nestjs/common';
import { EmailQueueService } from '../../src/queue/email-queue.service';

// Việc đã được "đặt" vào hàng đợi giả: chỉ ghi lại YÊU CẦU GÌ (loại việc + dữ liệu truyền vào).
// Không có jobId: jobId do EmailQueueService thật quyết định (test ở email-queue.service.spec.ts, job-ids.spec.ts).
export type RecordedJob =
  | { type: 'ping'; data?: undefined }
  | { type: 'welcome'; data: { userId: number } }
  | { type: 'order-confirmation'; data: { orderId: number } }
  | { type: 'payment-received'; data: { orderId: number } };

// `implements Pick<...>`: bản thật đổi/xóa/thêm hàm công khai mà bản giả không theo thì TypeScript báo lỗi biên dịch ngay
// (ESLint/build/ts-jest), thay vì để test xanh giả với một bản giả đã lệch.
export class FakeEmailQueueService implements Pick<
  EmailQueueService,
  | 'checkConnection'
  | 'addPing'
  | 'addWelcome'
  | 'addOrderConfirmation'
  | 'addPaymentReceived'
> {
  readonly jobs: RecordedJob[] = [];

  async checkConnection() {
    // Không có Redis nào để kiểm
  }

  addPing() {
    this.jobs.push({ type: 'ping' });
    return Promise.resolve(undefined);
  }

  addWelcome(userId: number) {
    this.jobs.push({ type: 'welcome', data: { userId } });
    return Promise.resolve(undefined);
  }

  // Chỉ nhận orderId: mã đơn bản thật chỉ dùng làm jobId (data job chỉ có orderId), bản giả không sinh jobId.
  // Bỏ tham số thứ hai vẫn khớp kiểu Pick<EmailQueueService, ...> (TypeScript cho phép hàm nhận ít tham số hơn).
  addOrderConfirmation(orderId: number) {
    this.jobs.push({ type: 'order-confirmation', data: { orderId } });
    return Promise.resolve(undefined);
  }

  // Như addOrderConfirmation: chỉ ghi lại orderId, mã đơn chỉ dùng làm jobId ở bản thật
  addPaymentReceived(orderId: number) {
    this.jobs.push({ type: 'payment-received', data: { orderId } });
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
