import { UPLOAD_URL_PREFIX } from '../uploads/upload.config';

// Cột User.avatarUrl là VARCHAR(191)
export const AVATAR_URL_MAX_LENGTH = 191;

export const MSG_AVATAR_URL_INVALID =
  'Đường dẫn ảnh đại diện không hợp lệ, vui lòng tải ảnh lên qua /uploads/avatars rồi dùng URL nhận được';

// <uuid>.<ext> do UploadService đặt tên (randomUUID là chữ thường; ext là jpg, png hoặc webp)
const AVATAR_FILE_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:jpg|png|webp)';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Trả về thông báo lỗi tiếng Việt nếu avatarUrl không hợp lệ, ngược lại trả null.
// null (xóa ảnh) là hợp lệ. Còn lại phải khớp TOÀN CHUỖI <publicUrl>/uploads/avatars/<uuid>.<jpg|png|webp>,
// nên URL ngoài, thư mục products, "../", "%2e%2e", query/hash, khoảng trắng và chuỗi rỗng đều bị loại.
// Không kiểm file có thật trên đĩa hay không (URL đúng định dạng nhưng chưa upload vẫn được chấp nhận).
export function validateAvatarUrl(
  url: string | null,
  publicUrl: string,
): string | null {
  if (url === null) {
    return null;
  }
  if (url.length > AVATAR_URL_MAX_LENGTH) {
    return `Đường dẫn ảnh đại diện không được vượt quá ${AVATAR_URL_MAX_LENGTH} ký tự`;
  }
  const pattern = new RegExp(
    `^${escapeRegExp(publicUrl)}${escapeRegExp(UPLOAD_URL_PREFIX)}/avatars/${AVATAR_FILE_PATTERN}$`,
  );
  return pattern.test(url) ? null : MSG_AVATAR_URL_INVALID;
}
