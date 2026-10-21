// Prisma 7: URL kết nối không còn nằm trong schema.prisma mà khai báo ở đây.
import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';
import { ENV_FILE } from './src/config/env-file';

// Prisma 7 không tự nạp file env; nạp .env.development hoặc .env.production theo NODE_ENV
config({ path: ENV_FILE, quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Prisma 7: lệnh seed khai báo ở đây (không còn trong package.json); chạy bằng `npx prisma db seed`
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
