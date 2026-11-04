/** Kiểu của API giỏ hàng (docs/api/cart.md ở backend). Mọi endpoint của giỏ đều trả đối tượng `Cart`. */

export interface CartItem {
  /** Id dòng giỏ (dùng cho PATCH/DELETE), khác `variantId`. */
  id: number
  variantId: number
  quantity: number
  productId: number
  name: string
  slug: string
  imageUrl: string | null
  size: string
  color: string
  /** `#RRGGBB` in hoa; null khi chưa có mã màu. */
  colorHex: string | null
  /** Giá hiện tại (VND), giỏ không lưu giá. */
  unitPrice: number
  lineTotal: number
  /** Biến thể đang bán và sản phẩm đang hiện. */
  purchasable: boolean
  inStock: boolean
  /** Chỉ dùng cho ô số lượng; 0 khi không mua được. */
  maxQuantity: number
}

export interface Cart {
  items: CartItem[]
  /** Chỉ tính các dòng mua được. */
  subtotal: number
  /** Chỉ tính các dòng mua được (tổng số lượng). */
  itemCount: number
  unavailableCount: number
}

export interface AddToCartInput {
  variantId: number
  quantity: number
}
