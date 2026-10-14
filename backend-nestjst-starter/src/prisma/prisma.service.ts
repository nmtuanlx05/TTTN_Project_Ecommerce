import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    // Prisma 7 yêu cầu driver adapter; MySQL dùng adapter MariaDB (tương thích MySQL 8).
    const url = new URL(config.getOrThrow<string>('DATABASE_URL'));
    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port) || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      connectionLimit: 10,
      // MySQL 8 mặc định xác thực caching_sha2_password: không có cờ này driver không lấy được khóa RSA và treo kết nối.
      // Chỉ an toàn cho dev (localhost); production nên dùng SSL.
      allowPublicKeyRetrieval: true,
    });

    super({
      adapter,
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Đã kết nối database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
