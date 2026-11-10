import { Logger } from '@nestjs/common';
import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { badGateway } from '../common/errors/coded-errors';
import {
  StorageService,
  type StoredImage,
  type StorageFolder,
  type UploadImageOptions,
} from './storage.types';

// Phần SDK mà driver dùng (v2 của `cloudinary`); tách ra để test truyền SDK giả, không gọi mạng.
export interface CloudinarySdk {
  config(options: {
    cloud_name: string;
    api_key: string;
    api_secret: string;
    secure: boolean;
  }): unknown;
  uploader: {
    upload_stream(
      options: Record<string, unknown>,
      callback: (
        error: UploadApiErrorResponse | undefined,
        result: UploadApiResponse | undefined,
      ) => void,
    ): { end(buffer: Buffer): unknown };
    destroy(
      publicId: string,
      options: Record<string, unknown>,
    ): Promise<{ result?: string }>;
  };
}

export interface CloudinaryStorageOptions {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folderPrefix: string;
}

export const ALLOWED_FORMATS = ['jpg', 'png', 'webp'];

export class CloudinaryStorage extends StorageService {
  readonly driver = 'cloudinary' as const;
  private readonly logger = new Logger(CloudinaryStorage.name);
  private readonly urlPrefix: string;

  constructor(
    private readonly options: CloudinaryStorageOptions,
    private readonly sdk: CloudinarySdk,
  ) {
    super();
    // Cấu hình SDK một lần; khóa chỉ nằm trong bộ nhớ, không log
    sdk.config({
      cloud_name: options.cloudName,
      api_key: options.apiKey,
      api_secret: options.apiSecret,
      secure: true,
    });
    this.urlPrefix = `https://res.cloudinary.com/${options.cloudName}/`;
  }

  isEnabled() {
    return true;
  }

  buildPublicId(folder: StorageFolder, name: string) {
    return `${this.options.folderPrefix}/${folder}/${name}`;
  }

  ownsUrl(url: string) {
    return url.startsWith(this.urlPrefix);
  }

  upload(buffer: Buffer, { folder, name }: UploadImageOptions) {
    const publicId = this.buildPublicId(folder, name);
    return new Promise<StoredImage>((resolve, reject) => {
      const stream = this.sdk.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: 'image',
          // Không ghi đè: publicId đã có thì giữ ảnh cũ (chạy lại script chuyển ảnh không tạo bản mới)
          overwrite: false,
          unique_filename: false,
          use_filename: false,
          allowed_formats: ALLOWED_FORMATS,
        },
        (error, result) => {
          if (error || !result) {
            // Chỉ ghi message/mã HTTP của SDK; không ghi cấu hình hay khóa
            this.logger.warn(
              `Tải ảnh lên Cloudinary lỗi (http ${error?.http_code ?? '?'}): ${error?.message ?? 'không có kết quả'}`,
            );
            const busy = error?.http_code === 420 || error?.http_code === 429;
            reject(
              badGateway(
                'STORAGE_UPLOAD_FAILED',
                busy
                  ? 'Dịch vụ lưu trữ ảnh đang quá tải, vui lòng thử lại sau'
                  : 'Không tải được ảnh lên dịch vụ lưu trữ, vui lòng thử lại sau',
              ),
            );
            return;
          }
          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            width: result.width ?? null,
            height: result.height ?? null,
            format: result.format ?? null,
            bytes: result.bytes ?? null,
          });
        },
      );
      stream.end(buffer);
    });
  }

  async delete(publicId: string) {
    const response = await this.sdk.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
    if (response.result === 'ok') return 'deleted' as const;
    if (response.result === 'not found') return 'not_found' as const;
    throw new Error(`Cloudinary trả kết quả lạ khi xóa: ${response.result}`);
  }
}
