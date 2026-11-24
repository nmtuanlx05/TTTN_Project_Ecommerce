import { Module } from '@nestjs/common';
import { EmailProcessor } from './email.processor';
import { QueueModule } from './queue.module';

// Phía XỬ LÝ job (worker). Class tĩnh; AppModule chỉ nạp khi QUEUE_WORKER_ENABLED khác 'false'.
// Tách riêng khỏi QueueModule để sau này chạy worker ở tiến trình riêng (hoặc tắt trên các bản API) mà không đổi code.
@Module({
  imports: [QueueModule],
  providers: [EmailProcessor],
})
export class QueueWorkerModule {}
