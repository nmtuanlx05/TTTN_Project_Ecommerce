import { createContext, useContext } from "react"

interface WishlistUi {
  /** Sản phẩm có trong danh sách yêu thích (từ `GET /wishlist/ids`); khách và quản trị luôn `false`. */
  isFavorite: (productId: number) => boolean
  /** Đang gửi yêu cầu thêm/bỏ cho đúng sản phẩm này. */
  isPending: (productId: number) => boolean
  /** Thêm hoặc bỏ yêu thích (đã gồm cổng đăng nhập: khách sang /login kèm toast, ADMIN/STAFF thấy toast, không gọi API). */
  toggle: (productId: number) => void
  /** Mở ngăn kéo yêu thích (cùng cổng đăng nhập). */
  openWishlist: () => void
}

export const WishlistUiContext = createContext<WishlistUi | null>(null)

/**
 * Cầu nối giữa thẻ/trang chi tiết sản phẩm (features/catalog), thanh bên tài khoản và yêu thích (features/wishlist), theo đúng mẫu `CartUiContext`:
 * các feature không import lẫn nhau nên `routes/storefront-layout-container.tsx` là nơi duy nhất biết `features/wishlist` và cung cấp các hàm này.
 * File `.ts` để tách khỏi quy tắc react-refresh.
 */
export function useWishlistUi(): WishlistUi {
  const value = useContext(WishlistUiContext)
  if (!value) throw new Error("useWishlistUi phải nằm trong StorefrontLayoutContainer.")
  return value
}
