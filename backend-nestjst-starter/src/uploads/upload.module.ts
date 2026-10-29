import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  loadUploadConfig,
  UPLOAD_CONFIG,
  UPLOAD_URL_PREFIX,
} from './upload.config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [
    // Chỉ phục vụ thư mục upload tại /uploads, không phục vụ gì khác. File tĩnh chạy ở middleware Express nên không qua guard.
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          rootPath: loadUploadConfig(config).rootDir,
          serveRoot: UPLOAD_URL_PREFIX,
          // Mọi GET /uploads/... không có file thì trả 404 theo format lỗi chung, không trả index.html
          exclude: [`${UPLOAD_URL_PREFIX}/{*any}`],
          serveStaticOptions: {
            index: false,
            dotfiles: 'deny',
            redirect: false,
            // Tên file là uuid, nội dung không bao giờ đổi
            maxAge: '365d',
            immutable: true,
            setHeaders: (res: {
              setHeader: (name: string, value: string) => void;
            }) => {
              res.setHeader('X-Content-Type-Options', 'nosniff');
              // Cho thẻ <img> ở origin khác (frontend) xem được, kể cả khi sau này bật helmet
              res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            },
          },
        },
      ],
    }),
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    RolesGuard,
    {
      provide: UPLOAD_CONFIG,
      inject: [ConfigService],
      useFactory: loadUploadConfig,
    },
  ],
  exports: [UploadService],
})
export class UploadModule {}
