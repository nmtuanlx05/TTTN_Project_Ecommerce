/** Loại upload của backend (`POST /uploads/<loại>`): mỗi loại có thư mục và giới hạn dung lượng riêng. */
export type ImageUploadKind = "products" | "avatars"

/**
 * Kết quả của `POST /uploads/<loại>` (docs/api/uploads.md). `assetId` dùng để GẮN ảnh vào dữ liệu (ưu tiên hơn `url`);
 * `url` là URL gốc https của Cloudinary. `width`/`height`/`format`/`bytes` có thể `null` nếu kho lưu trữ không trả.
 */
export interface UploadedImage {
  assetId: number
  url: string
  publicId: string
  width: number | null
  height: number | null
  format: string | null
  bytes: number | null
}
