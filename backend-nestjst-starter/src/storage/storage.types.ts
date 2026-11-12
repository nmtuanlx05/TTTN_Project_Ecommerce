import type { ImageType } from '../uploads/image-signature';

// Thư mục logic trong kho lưu trữ; khớp UploadKind.
export type StorageFolder = 'products' | 'avatars';

export interface StoredImage {
  publicId: string;
  // URL gốc (https), không kèm biến đổi
  secureUrl: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
}

export interface UploadImageOptions {
  folder: StorageFolder;
  // Tên (uuid) không đuôi; publicId được dựng xác định từ đây nên cùng tên thì cùng publicId.
  name: string;
  type: ImageType;
}

export type StorageDriverName = 'cloudinary' | 'disabled';

// Kho lưu trữ ảnh. Là abstract class để dùng làm token DI. Ném HttpException có `code` khi lỗi (STORAGE_NOT_CONFIGURED, STORAGE_UPLOAD_FAILED).
export abstract class StorageService {
  abstract readonly driver: StorageDriverName;
  // false = chưa cấu hình, mọi lần upload trả 503
  abstract isEnabled(): boolean;
  abstract buildPublicId(folder: StorageFolder, name: string): string;
  // URL này có thuộc kho của hệ thống không (dùng để từ chối URL "giả danh" asset chưa đăng ký)
  abstract ownsUrl(url: string): boolean;
  // overwrite=false: publicId đã có thì KHÔNG ghi đè (trả lại ảnh đã có nếu kho hỗ trợ)
  abstract upload(
    buffer: Buffer,
    options: UploadImageOptions,
  ): Promise<StoredImage>;
  // 'not_found' coi như đã xóa xong (idempotent). Lỗi thật thì ném.
  abstract delete(publicId: string): Promise<'deleted' | 'not_found'>;
}
