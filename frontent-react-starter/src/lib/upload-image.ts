import { apiUpload, type UploadOptions } from "@/lib/api-client"
import type { ImageUploadKind, UploadedImage } from "@/types/upload"

/**
 * Upload một ảnh lên `POST /uploads/<kind>` (docs/api/uploads.md) và trả thông tin ảnh (`assetId`, `url`, ...). Chỉ lưu file;
 * việc gắn ảnh vào dữ liệu (ảnh sản phẩm, avatar) do nơi gọi làm bằng request khác, ưu tiên gửi `assetId`.
 */
export function uploadImage(
  kind: ImageUploadKind,
  file: File,
  options?: UploadOptions,
): Promise<UploadedImage> {
  return apiUpload<UploadedImage>(`/uploads/${kind}`, file, options)
}
