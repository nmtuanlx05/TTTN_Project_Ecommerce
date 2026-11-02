import type { ProductVariant } from "./types"

/**
 * Liên kết sang trang Kho đã lọc theo SKU của biến thể. Chỉ là chuỗi đường dẫn (features không import lẫn
 * nhau). Bật `includeHidden` khi sản phẩm đang ẩn hoặc biến thể ngừng bán, nếu không kho không hiện hàng đó
 * (`isHidden = !variant.isActive || !product.isActive`). Dùng dữ liệu đã lưu trên server, không dùng ô đang sửa.
 */
export function inventoryLinkOf(
  variant: Pick<ProductVariant, "sku" | "isActive">,
  productIsActive: boolean,
): string {
  const params = new URLSearchParams({ q: variant.sku })
  if (!productIsActive || !variant.isActive) params.set("includeHidden", "true")
  return `/admin/inventory?${params.toString()}`
}
