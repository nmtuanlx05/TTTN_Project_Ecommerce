// Prisma 7: URL kết nối không còn nằm trong schema.prisma mà khai báo ở đây.
import 'dotenv/config'; // Prisma 7 không tự nạp .env
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
