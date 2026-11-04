import type { CatalogProductDetail } from "./types"

/** Danh sách URL cho bộ ảnh trang chi tiết: `images` (đã sắp xếp), rỗng thì dự phòng `[imageUrl]`; không có gì thì `[]` (khung dự phòng của `ProductImage`). */
export function galleryImages(product: Pick<CatalogProductDetail, "images" | "imageUrl">): string[] {
  if (product.images.length > 0) return product.images.map((image) => image.url)
  return product.imageUrl ? [product.imageUrl] : []
}
