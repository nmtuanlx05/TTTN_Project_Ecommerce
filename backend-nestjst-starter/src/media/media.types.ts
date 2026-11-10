import type { MediaAsset } from '../generated/prisma/client';

export type MediaKind = MediaAsset['kind'];

// Dữ liệu API trả sau khi tải ảnh lên (url giữ nguyên tên trường cũ; thêm assetId, publicId, kích thước).
export interface UploadedImage {
  assetId: number;
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
}

// Ảnh sản phẩm đã phân giải: assetId null = ảnh URL ngoài hoặc ảnh cũ chưa chuyển
export interface ResolvedImage {
  url: string;
  assetId: number | null;
}

export interface CleanupSummary {
  dryRun: boolean;
  // PENDING_DELETE đã xóa xong phía kho lưu trữ
  deleted: number;
  // Thử xóa nhưng lỗi (sẽ thử lại lần sau)
  failed: number;
  // PENDING_DELETE đã quá số lần thử, cần người xử lý
  gaveUp: number;
  // ACTIVE mồ côi quá hạn được chuyển sang PENDING_DELETE
  orphansMarked: number;
}
