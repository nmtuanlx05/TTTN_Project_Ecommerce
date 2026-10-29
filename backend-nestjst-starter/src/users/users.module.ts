import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AvatarUrlPipe } from './avatar-url.pipe';
import { UploadModule } from '../uploads/upload.module';
import { loadUploadConfig, UPLOAD_CONFIG } from '../uploads/upload.config';

@Module({
  imports: [UploadModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    AvatarUrlPipe,
    // AvatarUrlPipe cần APP_PUBLIC_URL; dùng lại factory của module uploads để không phải sửa module đó
    {
      provide: UPLOAD_CONFIG,
      inject: [ConfigService],
      useFactory: loadUploadConfig,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
