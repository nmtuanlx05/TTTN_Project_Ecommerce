// Cấu hình kho lưu trữ (Cloudinary) đọc từ biến môi trường. Thiếu/sai thì "disabled" kèm lý do (CHỈ chứa tên biến, không chứa giá trị);
// không bao giờ throw để app vẫn khởi động. Giá trị khóa không được log ở bất kỳ đâu.

export type StorageConfig =
  | {
      driver: 'cloudinary';
      cloudName: string;
      apiKey: string;
      apiSecret: string;
      folderPrefix: string;
    }
  | { driver: 'disabled'; reason: string };

export const DEFAULT_FOLDER_PREFIX_BASE = 'mono-studio';

const clean = (value: string | undefined) => value?.trim() || undefined;
const FOLDER_PREFIX_PATTERN = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/;

// Mặc định theo môi trường: mono-studio/development, mono-studio/production (dev và production không lẫn thư mục).
export function defaultFolderPrefix(nodeEnv: string | undefined): string {
  return `${DEFAULT_FOLDER_PREFIX_BASE}/${clean(nodeEnv) ?? 'development'}`;
}

export function readStorageConfig(
  get: (key: string) => string | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): StorageConfig {
  const cloudName = clean(get('CLOUDINARY_CLOUD_NAME'));
  const apiKey = clean(get('CLOUDINARY_API_KEY'));
  const apiSecret = clean(get('CLOUDINARY_API_SECRET'));
  const missing = [
    ['CLOUDINARY_CLOUD_NAME', cloudName],
    ['CLOUDINARY_API_KEY', apiKey],
    ['CLOUDINARY_API_SECRET', apiSecret],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    return {
      driver: 'disabled',
      reason: `Thiếu biến môi trường: ${missing.join(', ')}`,
    };
  }

  const folderPrefix =
    clean(get('CLOUDINARY_FOLDER_PREFIX')) ?? defaultFolderPrefix(nodeEnv);
  if (!FOLDER_PREFIX_PATTERN.test(folderPrefix)) {
    return {
      driver: 'disabled',
      reason:
        'CLOUDINARY_FOLDER_PREFIX không hợp lệ (chỉ chữ, số, _, -, và / giữa các đoạn)',
    };
  }
  return {
    driver: 'cloudinary',
    cloudName: cloudName!,
    apiKey: apiKey!,
    apiSecret: apiSecret!,
    folderPrefix,
  };
}
