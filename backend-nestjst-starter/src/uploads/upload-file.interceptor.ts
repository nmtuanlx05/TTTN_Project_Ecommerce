import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
  Type,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Observable } from 'rxjs';
import { ALLOWED_MIME_TYPES } from './image-signature';
import {
  MSG_UNSUPPORTED_IMAGE,
  UPLOAD_CONFIG,
  UPLOAD_FIELD,
  UPLOAD_KINDS,
  type UploadConfig,
  type UploadKind,
} from './upload.config';

// Cấu hình Multer dùng chung cho mọi loại upload; chỉ khác nhau ở giới hạn dung lượng.
export function createMulterOptions(kind: UploadKind, config: UploadConfig) {
  return {
    // File ghi tạm vào thư mục .tmp (không công khai) với tên ngẫu nhiên, chờ UploadService kiểm chữ ký rồi mới chuyển đi.
    // destination là hàm để tạo lại .tmp cho mỗi request: Multer chỉ tự tạo thư mục một lần khi cấu hình,
    // nếu thư mục bị xóa lúc server đang chạy thì mọi upload sẽ lỗi ENOENT.
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        mkdir(config.tmpDir, { recursive: true }).then(
          () => cb(null, config.tmpDir),
          (error: Error) => cb(error, config.tmpDir),
        );
      },
      filename: (_req, _file, cb) => cb(null, randomUUID()),
    }),
    // Đúng một file, không kèm trường text nào.
    // Busboy coi file đúng bằng fileSize là đã chạm giới hạn, nên cộng 1 để file đúng bằng "tối đa" vẫn được nhận.
    limits: {
      fileSize: UPLOAD_KINDS[kind].maxBytes + 1,
      files: 1,
      fields: 0,
    },
    fileFilter: (
      _req: unknown,
      file: Express.Multer.File,
      cb: (error: Error | null, accept: boolean) => void,
    ) => {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        cb(new UnsupportedMediaTypeException(MSG_UNSUPPORTED_IMAGE), false);
        return;
      }
      cb(null, true);
    },
  };
}

// Đổi lỗi Multer (message tiếng Anh do Nest dựng) sang message tiếng Việt.
// 413 chỉ đến từ giới hạn dung lượng; 400 ở bước này chỉ đến từ Multer (fileFilter ném 415).
export function mapMulterError(error: unknown, kind: UploadKind): unknown {
  if (error instanceof PayloadTooLargeException) {
    return new PayloadTooLargeException(
      `File vượt quá dung lượng cho phép (tối đa ${UPLOAD_KINDS[kind].maxLabel})`,
    );
  }
  if (error instanceof BadRequestException) {
    return new BadRequestException(
      `Chỉ được gửi đúng 1 file ở trường "${UPLOAD_FIELD}", không kèm trường khác`,
    );
  }
  return error;
}

// Interceptor nhận 1 file ở trường "file" cho từng loại upload (products, avatars).
export function UploadFileInterceptor(kind: UploadKind): Type<NestInterceptor> {
  @Injectable()
  class MixinUploadFileInterceptor implements NestInterceptor {
    private readonly delegate: NestInterceptor;

    constructor(@Inject(UPLOAD_CONFIG) config: UploadConfig) {
      const FileInterceptorClass = FileInterceptor(
        UPLOAD_FIELD,
        createMulterOptions(kind, config),
      );
      this.delegate = new FileInterceptorClass();
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<unknown>> {
      try {
        return await this.delegate.intercept(context, next);
      } catch (error) {
        throw mapMulterError(error, kind);
      }
    }
  }
  return MixinUploadFileInterceptor;
}
