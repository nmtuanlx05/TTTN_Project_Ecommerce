// Chuyển ảnh cũ trên đĩa (uploads/) lên kho lưu trữ (Cloudinary). Chi tiết và cách hoàn tác: docs/cloudinary-setup.md
//
//   npm run media:migrate-legacy                      # chạy thử (mặc định): không ghi DB, không tải lên
//   npm run media:migrate-legacy -- --apply           # thực thi
//   npm run media:migrate-legacy -- --limit 5 --verbose
//   npm run media:migrate-legacy -- --rollback        # chạy thử hoàn tác; thêm --apply để thực thi
//
// Không xóa file cũ. Mã thoát 1 nếu có ảnh lỗi. PHẢI sao lưu DB (mysqldump) trước khi chạy với --apply.
import 'reflect-metadata';
import { readFile } from 'fs/promises';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { LegacyImageMigration } from '../src/media/legacy-migration';
import { MediaCliModule } from '../src/media/media-cli.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.types';
import { loadUploadConfig } from '../src/uploads/upload.config';

function parseArgs(argv: string[]) {
  const args = {
    apply: false,
    rollback: false,
    verbose: false,
    limit: undefined as number | undefined,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--dry-run') args.apply = false;
    else if (arg === '--rollback') args.rollback = true;
    else if (arg === '--verbose') args.verbose = true;
    else if (arg === '--limit') {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error('--limit phải là số nguyên dương');
      }
      args.limit = value;
    } else {
      throw new Error(`Tham số không hợp lệ: ${arg}`);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(MediaCliModule, {
    logger: ['error', 'warn'],
  });
  try {
    const migration = new LegacyImageMigration(
      app.get(PrismaService),
      app.get(StorageService),
      async (path) => {
        try {
          return await readFile(path);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
          throw error;
        }
      },
      (entry) => console.log(JSON.stringify(entry)),
    );
    console.error(
      args.apply
        ? '== CHẠY THẬT (--apply) =='
        : '== CHẠY THỬ (không ghi gì; thêm --apply để thực thi) ==',
    );
    const summary = await migration.run({
      ...args,
      uploadsDir: loadUploadConfig(app.get(ConfigService)).rootDir,
    });
    console.log(JSON.stringify({ summary }));
    process.exitCode = summary.errors > 0 ? 1 : 0;
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
