import type { WishlistItem, WishlistItemStatus } from "./types"

/** Kiểm `isListed` trước (false → ngừng kinh doanh, không link), rồi mới `isAvailable` (false → hết hàng). Không dùng `inStock` để suy ra. */
export function wishlistStatusOf(item: Pick<WishlistItem, "isListed" | "isAvailable">): WishlistItemStatus {
  if (!item.isListed) return "discontinued"
  return item.isAvailable ? "available" : "sold-out"
}
