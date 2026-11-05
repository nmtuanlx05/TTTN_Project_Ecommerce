import type { ReactNode } from "react"

/** Kiểu của API wishlist (docs/api/wishlist.md ở backend, chỉ CUSTOMER). Thẻ là thẻ sản phẩm công khai cộng ba trường riêng. */

export interface WishlistCategoryRef {
  id: number
  name: string
  slug: string
}

/** Màu của thẻ; `hex` (#RRGGBB in hoa) là null khi admin chưa nhập mã màu. */
export interface WishlistColor {
  name: string
  hex: string | null
}

export interface WishlistItem {
  id: number
  name: string
  slug: string
  /** VND, số nguyên. */
  price: number
  imageUrl: string | null
  secondImageUrl: string | null
  colors: WishlistColor[]
  category: WishlistCategoryRef
  /** Còn ít nhất một biến thể đang bán có tồn khả dụng. KHÔNG xét sản phẩm bật hay tắt: đừng dùng nó để suy ra "ngừng kinh doanh". */
  inStock: boolean
  lowStock: boolean
  /** ISO 8601, UTC. */
  addedAt: string
  /** Sản phẩm bật VÀ có ít nhất một biến thể đang bán. `false` = ngừng kinh doanh (trang chi tiết 404). */
  isListed: boolean
  /** Sản phẩm bật VÀ còn hàng; `true` luôn kéo theo `isListed = true`. */
  isAvailable: boolean
}

/** Kết quả `POST /wishlist/:productId` (`added: false` khi đã có sẵn). */
export interface WishlistAddResult {
  productId: number
  added: boolean
}

/** Kết quả `DELETE /wishlist/:productId` (`removed: false` khi không có để bỏ). */
export interface WishlistRemoveResult {
  productId: number
  removed: boolean
}

/** Trạng thái hiển thị của một thẻ, suy ra từ `isListed` rồi `isAvailable` (xem `wishlistStatusOf`). */
export type WishlistItemStatus = "available" | "sold-out" | "discontinued"

/**
 * Slot "Thêm vào giỏ hàng" do nơi ghép (routes) truyền vào ngăn kéo, vì việc chọn biến thể và gọi giỏ nằm ở feature khác (features/wishlist không import chéo).
 * Ngăn kéo giữ `expanded` để CHỈ MỘT thẻ mở vùng chọn size tại một thời điểm; thẻ bị bỏ khỏi yêu thích thì biến mất nên tự thu lại.
 * Chỉ được gọi cho thẻ `available`; thẻ hết hàng / ngừng kinh doanh dùng nút khóa của chính ngăn kéo.
 */
export type WishlistAddToCartSlot = (props: {
  item: WishlistItem
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}) => ReactNode
