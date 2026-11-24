import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EmailQueueService } from './email-queue.service';
import { DEFAULT_JOB_OPTIONS, EMAIL_QUEUE } from './queue.constants';
import { readQueueConfig } from './queue.config';

// Phía ĐẶT job (producer): kết nối Redis và hàng đợi email. Luôn được nạp vì Redis là bắt buộc.
// Cố ý là class TĨNH (không có register() động): Test.overrideModule(QueueModule) khớp module bằng đúng class này,
// nên test thay được cả module bằng FakeQueueModule mà không cần Redis.
// ConfigModule phải là global (AppModule) hoặc được nạp cùng: forRootAsync đọc cấu hình qua ConfigService.
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const queue = readQueueConfig((key) => config.get<string>(key));
        return {
          // Truyền object tùy chọn (host/port/password/tls), không truyền instance ioredis
          connection: queue.connection,
          prefix: queue.prefix,
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        };
      },
    }),
    // KHÔNG bật forceDisconnectOnShutdown: đã đo, tùy chọn này chờ client sẵn sàng khi tắt nên treo vô hạn nếu Redis đang mất.
    // Mặc định (đóng hàng đợi bình thường) tắt tức thì cả khi Redis không chạy.
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
  ],
  providers: [EmailQueueService],
  exports: [EmailQueueService],
})
export class QueueModule {}
