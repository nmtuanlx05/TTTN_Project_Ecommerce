import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { readMediaSettings } from './media.config';
import { MediaService } from './media.service';

// Chỉ nạp qua MediaSchedulerModule (AppModule). Test/e2e dựng module riêng nên không bao giờ chạy tác vụ thật.
// Mỗi giờ (phút 17 để lệch khỏi các tác vụ khác): thử lại ảnh PENDING_DELETE lỗi và dọn ảnh mồ côi quá hạn.
@Injectable()
export class MediaCleanupCron {
  private readonly logger = new Logger(MediaCleanupCron.name);
  private running = false;

  constructor(
    private readonly media: MediaService,
    private readonly config: ConfigService,
  ) {}

  @Cron('17 * * * *')
  async run() {
    // Tắt bằng MEDIA_CLEANUP_ENABLED=false; chưa cấu hình kho lưu trữ thì không có gì để dọn
    if (!readMediaSettings((k) => this.config.get<string>(k)).cleanupEnabled) {
      return;
    }
    if (!this.media.storageEnabled) return;
    // Chống chồng lượt trong cùng một tiến trình
    if (this.running) return;
    this.running = true;
    try {
      const summary = await this.media.cleanup();
      this.logger.log(
        `Dọn ảnh: xóa ${summary.deleted}, lỗi ${summary.failed}, bỏ cuộc ${summary.gaveUp}, mồ côi mới đánh dấu ${summary.orphansMarked}`,
      );
    } catch (error) {
      this.logger.error(
        `Tác vụ dọn ảnh lỗi: ${error instanceof Error ? error.message : 'lỗi không xác định'}`,
      );
    } finally {
      this.running = false;
    }
  }
}
