import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
  Type,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Observable } from 'rxjs';
import { ALLOWED_MIME_TYPES } from './image-signature';
import {
  MSG_UNSUPPORTED_IMAGE,
  UPLOAD_FIELD,
  UPLOAD_KINDS,
  type UploadKind,
} from './upload.config';

// Cấu hình Multer dùng chung cho mọi loại upload; chỉ khác nhau ở giới hạn dung lượng.
export function createMulterOptions(kind: UploadKind) {
  return {
    // Giữ file trong bộ nhớ (tối đa maxBytes mỗi request) rồi đẩy thẳng lên kho lưu trữ bằng stream: không ghi đĩa tạm.
    storage: memoryStorage(),
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

    constructor() {
      const FileInterceptorClass = FileInterceptor(
        UPLOAD_FIELD,
        createMulterOptions(kind),
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
