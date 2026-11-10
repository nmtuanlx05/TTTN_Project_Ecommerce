// Cấu hình tải ảnh và dọn ảnh, đọc từ biến môi trường (đều tùy chọn, có mặc định).

export const DEFAULT_QUOTA_PRODUCTS_PER_DAY = 100;
export const DEFAULT_QUOTA_AVATARS_PER_DAY = 10;
export const DEFAULT_ORPHAN_MIN_AGE_HOURS = 24;
// Số lần thử xóa tối đa cho một asset PENDING_DELETE; quá mức thì dừng thử và chỉ báo trong log
export const MAX_DELETE_ATTEMPTS = 5;
// Số asset xử lý tối đa mỗi lần dọn (chặn một lượt quá nặng)
export const CLEANUP_BATCH_SIZE = 200;
export const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface MediaSettings {
  // Số lần tải lên tối đa mỗi người dùng trong 24 giờ gần nhất
  quotaPerDay: { PRODUCT: number; AVATAR: number };
  // Cho phép ảnh sản phẩm là URL ngoài (https). Mặc định bật; đặt ALLOW_EXTERNAL_IMAGE_URLS=false để tắt (khuyến nghị ở production)
  allowExternalImageUrls: boolean;
  // Tác vụ dọn ảnh định kỳ (MEDIA_CLEANUP_ENABLED=false để tắt)
  cleanupEnabled: boolean;
  orphanMinAgeHours: number;
  // APP_PUBLIC_URL đã bỏ dấu / cuối, dùng nhận diện URL ảnh cũ do backend này từng phục vụ
  publicUrl: string;
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw?.trim());
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function readMediaSettings(
  get: (key: string) => string | undefined,
): MediaSettings {
  return {
    quotaPerDay: {
      PRODUCT: positiveInt(
        get('MEDIA_QUOTA_PRODUCTS_PER_DAY'),
        DEFAULT_QUOTA_PRODUCTS_PER_DAY,
      ),
      AVATAR: positiveInt(
        get('MEDIA_QUOTA_AVATARS_PER_DAY'),
        DEFAULT_QUOTA_AVATARS_PER_DAY,
      ),
    },
    allowExternalImageUrls:
      get('ALLOW_EXTERNAL_IMAGE_URLS')?.trim().toLowerCase() !== 'false',
    cleanupEnabled:
      get('MEDIA_CLEANUP_ENABLED')?.trim().toLowerCase() !== 'false',
    orphanMinAgeHours: positiveInt(
      get('MEDIA_ORPHAN_MIN_AGE_HOURS'),
      DEFAULT_ORPHAN_MIN_AGE_HOURS,
    ),
    publicUrl: (
      get('APP_PUBLIC_URL')?.trim() || 'http://localhost:3000'
    ).replace(/\/+$/, ''),
  };
}
