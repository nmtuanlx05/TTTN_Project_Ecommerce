import type { ImageUploadKind } from "@/types/upload"

/**
 * Quy tắc ảnh upload, khớp backend (docs/api/uploads.md, `src/uploads/upload.config.ts`). Đổi ở backend thì
 * phải đổi ở đây. Client chỉ kiểm để báo lỗi sớm; backend mới là nơi kiểm thật (kể cả chữ ký byte của file).
 */

const MB = 1024 * 1024

export const IMAGE_UPLOAD_RULES: Record<ImageUploadKind, { maxBytes: number; maxLabel: string }> = {
  products: { maxBytes: 5 * MB, maxLabel: "5 MB" },
  avatars: { maxBytes: 2 * MB, maxLabel: "2 MB" },
}

/** Loại file backend nhận. Không nhận GIF, SVG, PDF. */
export const ACCEPTED_IMAGE_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"]

/** Giá trị cho thuộc tính `accept` của `<input type="file">`. */
export const IMAGE_INPUT_ACCEPT = ACCEPTED_IMAGE_TYPES.join(",")

export const ACCEPTED_IMAGE_LABEL = "JPEG, PNG hoặc WebP"

export const MSG_ONE_IMAGE_ONLY = "Chỉ tải lên một ảnh mỗi lần. Chọn một ảnh thôi."

/**
 * Trả thông báo lỗi tiếng Việt nếu file không nên gửi lên, ngược lại `null`.
 * `File.type` do trình duyệt khai (đoán theo đuôi file) và backend cũng chặn theo giá trị này,
 * nên `type` rỗng hoặc lạ coi như sai loại. File đúng bằng dung lượng tối đa vẫn được nhận.
 */
export function validateImageFile(file: File, kind: ImageUploadKind): string | null {
  if (file.size === 0) return "File ảnh trống. Chọn một file ảnh khác."
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return `Chỉ chấp nhận ảnh ${ACCEPTED_IMAGE_LABEL}. Chọn file đúng định dạng.`
  }
  const { maxBytes, maxLabel } = IMAGE_UPLOAD_RULES[kind]
  if (file.size > maxBytes) return `Ảnh vượt quá ${maxLabel}. Chọn ảnh nhỏ hơn.`
  return null
}
