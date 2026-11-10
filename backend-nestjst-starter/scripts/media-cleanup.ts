// Dọn ảnh: xóa phía kho lưu trữ các ảnh PENDING_DELETE và ảnh mồ côi quá hạn. Chạy tay:
//   npm run media:cleanup -- --dry-run    # chỉ đếm, không ghi gì
//   npm run media:cleanup                 # thực thi
// Cùng logic với tác vụ định kỳ (MediaCleanupCron). Mã thoát 1 nếu có ảnh xóa lỗi.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MediaCliModule } from '../src/media/media-cli.module';
import { MediaService } from '../src/media/media.service';

async function main() {
  const dryRun = process.argv.slice(2).includes('--dry-run');
  const app = await NestFactory.createApplicationContext(MediaCliModule, {
    logger: ['error', 'warn'],
  });
  try {
    const media = app.get(MediaService);
    if (!media.storageEnabled && !dryRun) {
      throw new Error(
        'Kho lưu trữ chưa được cấu hình (STORAGE_DRIVER / CLOUDINARY_*), không thể dọn ảnh',
      );
    }
    const summary = await media.cleanup({ dryRun });
    console.log(JSON.stringify({ summary }));
    process.exitCode = summary.failed > 0 ? 1 : 0;
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
