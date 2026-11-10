import type { ApiError } from "@/lib/api-error"

/**
 * Câu tiếng Việt cho lỗi tải ảnh lên, theo mã lỗi (docs/api/uploads.md, "Response lỗi"). Backend không có mã riêng cho 413 (quá dung lượng /
 * quá điểm ảnh) và 415 (sai loại / ảnh hỏng), chỉ khác nhau ở nội dung, nên các trường hợp đó dùng nguyên thông báo của server. Mã lạ hoặc
 * không có mã: thông báo của server.
 */
const MESSAGE_BY_CODE: Record<string, string> = {
  UPLOAD_QUOTA_EXCEEDED: "Bạn đã tải lên quá số ảnh cho phép trong 24 giờ qua. Vui lòng thử lại sau.",
  STORAGE_NOT_CONFIGURED: "Kho lưu trữ ảnh chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
  STORAGE_UPLOAD_FAILED: "Không tải được ảnh lên dịch vụ lưu trữ. Vui lòng thử lại sau.",
}

export function describeUploadError(error: ApiError): string {
  return (error.code && MESSAGE_BY_CODE[error.code]) || error.message
}

/** Lỗi do chính file (sai loại, quá lớn, ảnh hỏng): tải lại đúng file đó vô ích. Các lỗi còn lại (mạng, kho ảnh, hạn mức) có thể thử lại. */
export function isFileProblem(error: ApiError): boolean {
  return error.statusCode === 413 || error.statusCode === 415
}
