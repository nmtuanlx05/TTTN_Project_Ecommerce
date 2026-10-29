import { join, resolve } from 'path';
import type { ConfigService } from '@nestjs/config';

// Token DI của cấu hình upload đã phân giải (đường dẫn tuyệt đối, URL công khai).
export const UPLOAD_CONFIG = 'UPLOAD_CONFIG';

// Tên field multipart duy nhất được chấp nhận.
export const UPLOAD_FIELD = 'file';

// Message lỗi 415 khi file không phải JPEG/PNG/WebP (sai mimetype khai báo hoặc sai chữ ký byte).
export const MSG_UNSUPPORTED_IMAGE = 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP';

// Phần đường dẫn công khai; ServeStaticModule phục vụ thư mục upload tại đây.
export const UPLOAD_URL_PREFIX = '/uploads';

export const DEFAULT_UPLOAD_DIR = 'uploads';
export const DEFAULT_PUBLIC_URL = 'http://localhost:3000';

// Thư mục tạm bắt đầu bằng dấu chấm: ServeStatic (dotfiles: 'deny') không bao giờ phục vụ nó.
export const TMP_DIR_NAME = '.tmp';

export type UploadKind = 'products' | 'avatars';

interface UploadKindConfig {
  // Dung lượng tối đa (byte)
  maxBytes: number;
  // Dùng trong message lỗi tiếng Việt, vd "5 MB"
  maxLabel: string;
}

const MB = 1024 * 1024;

export const UPLOAD_KINDS: Record<UploadKind, UploadKindConfig> = {
  products: { maxBytes: 5 * MB, maxLabel: '5 MB' },
  avatars: { maxBytes: 2 * MB, maxLabel: '2 MB' },
};

// Cột Product.imageUrl là VARCHAR(191); URL trả về không được dài hơn.
const IMAGE_URL_COLUMN_LENGTH = 191;
// <uuid>(36) + "." + ext dài nhất ("webp" = 4)
const FILE_NAME_MAX_LENGTH = 36 + 1 + 4;
const LONGEST_URL_PATH = Math.max(
  ...(Object.keys(UPLOAD_KINDS) as UploadKind[]).map(
    (kind) => `${UPLOAD_URL_PREFIX}/${kind}/`.length + FILE_NAME_MAX_LENGTH,
  ),
);

// Độ dài tối đa của APP_PUBLIC_URL (đã bỏ dấu / cuối) để URL ảnh luôn vừa cột imageUrl: 191 - 59 = 132.
export const MAX_PUBLIC_URL_LENGTH = IMAGE_URL_COLUMN_LENGTH - LONGEST_URL_PATH;

export interface UploadConfig {
  // Thư mục gốc (đường dẫn tuyệt đối)
  rootDir: string;
  // Thư mục chứa file vừa nhận, chưa kiểm chứng
  tmpDir: string;
  // APP_PUBLIC_URL đã bỏ dấu / cuối
  publicUrl: string;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined;
}

function normalizePublicUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

// Trả về thông báo lỗi tiếng Việt nếu APP_PUBLIC_URL không hợp lệ, ngược lại trả null.
export function validatePublicUrl(value: string): string | null {
  const url = normalizePublicUrl(value);
  let protocol: string;
  try {
    protocol = new URL(url).protocol;
  } catch {
    return 'APP_PUBLIC_URL không phải URL hợp lệ (vd http://localhost:3000).';
  }
  if (protocol !== 'http:' && protocol !== 'https:') {
    return 'APP_PUBLIC_URL phải bắt đầu bằng http:// hoặc https://.';
  }
  if (url.length > MAX_PUBLIC_URL_LENGTH) {
    return `APP_PUBLIC_URL không được dài quá ${MAX_PUBLIC_URL_LENGTH} ký tự (để URL ảnh vừa cột imageUrl VARCHAR(${IMAGE_URL_COLUMN_LENGTH})).`;
  }
  return null;
}

// UPLOAD_DIR và APP_PUBLIC_URL đều tùy chọn: thiếu hoặc rỗng thì dùng giá trị mặc định.
export function resolveUploadConfig(env: {
  UPLOAD_DIR?: unknown;
  APP_PUBLIC_URL?: unknown;
}): UploadConfig {
  const rootDir = resolve(
    process.cwd(),
    readString(env.UPLOAD_DIR) ?? DEFAULT_UPLOAD_DIR,
  );
  const publicUrl = normalizePublicUrl(
    readString(env.APP_PUBLIC_URL) ?? DEFAULT_PUBLIC_URL,
  );
  return { rootDir, tmpDir: join(rootDir, TMP_DIR_NAME), publicUrl };
}

export function loadUploadConfig(config: ConfigService): UploadConfig {
  return resolveUploadConfig({
    UPLOAD_DIR: config.get<string>('UPLOAD_DIR'),
    APP_PUBLIC_URL: config.get<string>('APP_PUBLIC_URL'),
  });
}
