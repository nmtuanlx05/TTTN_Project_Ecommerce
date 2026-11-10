import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ENV_FILE } from '../config/env-file';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaModule } from './media.module';

// Module tối thiểu cho các lệnh chạy tay (scripts/): chỉ cấu hình, Prisma và kho lưu trữ; không có HTTP, không có tác vụ định kỳ.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ENV_FILE }),
    PrismaModule,
    MediaModule,
  ],
})
export class MediaCliModule {}
