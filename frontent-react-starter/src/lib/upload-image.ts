import { apiUpload, type UploadOptions } from "@/lib/api-client"
import type { ImageUploadKind } from "@/types/upload"

interface UploadImageResult {
  /** URL đầy đủ, dùng thẳng trong `<img src>` và lưu nguyên chuỗi vào `imageUrl`. */
  url: string
}

/**
 * Upload một ảnh lên `POST /uploads/<kind>` (docs/api/uploads.md) và trả URL của ảnh. Chỉ lưu file;
 * việc gắn URL vào dữ liệu (vd `imageUrl` của sản phẩm) do form tự làm bằng request khác.
 */
export async function uploadImage(
  kind: ImageUploadKind,
  file: File,
  options?: UploadOptions,
): Promise<string> {
  const result = await apiUpload<UploadImageResult>(`/uploads/${kind}`, file, options)
  return result.url
}
