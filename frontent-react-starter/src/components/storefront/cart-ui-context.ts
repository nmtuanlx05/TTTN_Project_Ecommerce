import { createContext, useContext } from "react"

/** Dữ liệu một lần thêm vào giỏ (khớp `POST /cart/items`). */
export interface CartAddInput {
  variantId: number
  quantity: number
}

interface CartUi {
  /** Cổng đăng nhập cho hành động mua (`useRequireLogin`): chỉ CUSTOMER mới chạy `onCustomer`; khách sang /login, ADMIN/STAFF thấy toast. */
  requireLogin: (onCustomer: () => void) => void
  /**
   * Thêm vào giỏ (đã gồm cổng đăng nhập). Thành công thì MỞ ngăn kéo giỏ (trừ khi `openCart: false`, vd. đang đóng hộp thoại và sẽ tự mở sau) và trả `true`; lỗi (toast message của backend đã hiện) hoặc không qua cổng thì trả `false`.
   * Lỗi 409 vẫn làm mới giỏ nên số lượng/cờ trong ngăn kéo luôn đúng.
   */
  addToCart: (input: CartAddInput, options?: { openCart?: boolean }) => Promise<boolean>
  /** Mở ngăn kéo giỏ (không qua cổng đăng nhập: chỉ gọi sau khi đã thêm thành công). */
  openCart: () => void
  /** Đang gửi một yêu cầu thêm vào giỏ (khóa các nút thêm). */
  adding: boolean
}

export const CartUiContext = createContext<CartUi | null>(null)

/**
 * Cầu nối giữa trang/thẻ sản phẩm (features/catalog) và giỏ hàng (features/cart): hai feature không import lẫn nhau, nên
 * `routes/storefront-layout-container.tsx` là nơi duy nhất biết cả hai và cung cấp các hàm này qua `CartUiContext.Provider`. File `.ts` (không phải `.tsx`) để tách khỏi quy tắc react-refresh.
 */
export function useCartUi(): CartUi {
  const value = useContext(CartUiContext)
  if (!value) throw new Error("useCartUi phải nằm trong StorefrontLayoutContainer.")
  return value
}
