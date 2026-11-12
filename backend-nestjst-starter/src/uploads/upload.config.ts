// Tên field multipart duy nhất được chấp nhận.
export const UPLOAD_FIELD = 'file';

// Message lỗi 415 khi file không phải JPEG/PNG/WebP (sai mimetype khai báo hoặc sai chữ ký byte).
export const MSG_UNSUPPORTED_IMAGE = 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP';

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
