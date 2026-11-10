import { serviceUnavailable } from '../common/errors/coded-errors';
import { StorageService } from './storage.types';

export const storageNotConfigured = () =>
  serviceUnavailable(
    'STORAGE_NOT_CONFIGURED',
    'Chức năng tải ảnh chưa được cấu hình trên máy chủ, vui lòng liên hệ quản trị viên',
  );

// Dùng khi chưa cấu hình kho lưu trữ: app vẫn chạy, chỉ việc tải ảnh lên trả 503 STORAGE_NOT_CONFIGURED.
export class DisabledStorage extends StorageService {
  readonly driver = 'disabled' as const;

  // reason chỉ chứa TÊN biến (xem storage.config.ts), an toàn để log
  constructor(readonly reason: string) {
    super();
  }

  isEnabled() {
    return false;
  }

  buildPublicId(folder: string, name: string) {
    return `${folder}/${name}`;
  }

  ownsUrl() {
    return false;
  }

  upload(): Promise<never> {
    return Promise.reject(storageNotConfigured());
  }

  delete(): Promise<never> {
    return Promise.reject(new Error('Kho lưu trữ ảnh chưa được cấu hình'));
  }
}
