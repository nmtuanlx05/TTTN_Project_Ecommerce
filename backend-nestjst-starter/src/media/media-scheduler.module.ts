import { Module } from '@nestjs/common';
import { MediaCleanupCron } from './media-cleanup.cron';
import { MediaModule } from './media.module';

// Tách riêng để chỉ AppModule nạp lập lịch; MediaModule (và test) không phụ thuộc @nestjs/schedule.
// Cần ScheduleModule.forRoot() đã nạp ở AppModule.
@Module({
  imports: [MediaModule],
  providers: [MediaCleanupCron],
})
export class MediaSchedulerModule {}
