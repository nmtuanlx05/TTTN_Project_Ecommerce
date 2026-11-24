import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { EmailProcessor } from './email.processor';
import { QueueModule } from './queue.module';

// Phía XỬ LÝ job (worker). Class tĩnh; AppModule chỉ nạp khi QUEUE_WORKER_ENABLED khác 'false'.
// Tách riêng khỏi QueueModule để sau này chạy worker ở tiến trình riêng (hoặc tắt trên các bản API) mà không đổi code.
@Module({
  // MailModule chỉ nạp ở phía worker (tắt worker thì không dựng transport SMTP); PrismaModule và ConfigModule là global
  imports: [QueueModule, MailModule],
  providers: [EmailProcessor],
})
export class QueueWorkerModule {}
