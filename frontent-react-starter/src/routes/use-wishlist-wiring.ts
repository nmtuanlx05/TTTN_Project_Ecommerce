import { useEffect, useRef, useState } from "react"
import type { useRequireLogin } from "@/features/auth/use-require-login"
import { useCurrentRole } from "@/features/auth/use-current-role"
import { WISHLIST_MESSAGES } from "@/features/wishlist/constants"
import { useToggleWishlist } from "@/features/wishlist/use-toggle-wishlist"
import { useOpenUntilNavigation } from "@/hooks/use-open-until-navigation"

/**
 * Nối yêu thích vào khung storefront (routes là nơi duy nhất biết `features/wishlist`): ids/toggle chỉ chạy cho CUSTOMER, trạng thái mở/đóng ngăn kéo (tự đóng khi đổi trang, như giỏ),
 * và giá trị cho `WishlistUiContext`. Mọi hành động (tim, mở ngăn kéo) đi qua cổng đăng nhập với thông điệp riêng của yêu thích: khách sang /login kèm toast, KHÔNG gọi API, KHÔNG tự thêm
 * sau khi đăng nhập; ADMIN/STAFF thấy toast. Đăng xuất / hết phiên đã `queryClient.clear()` nên không cần reset riêng.
 * `count` là độ dài mảng ids: nguồn chung của huy hiệu header và số ở tiêu đề ngăn kéo.
 *
 * CHUYỂN NGĂN KÉO: thêm vào giỏ từ ngăn kéo yêu thích thành công thì `addToCart` mở giỏ (`cartOpen`). Thấy giỏ mở trong lúc yêu thích đang mở, hook đóng yêu thích NGAY TRONG LẦN RENDER ĐÓ
 * (cập nhật state lúc render, như `useOpenUntilNavigation`), nên hai ngăn kéo đổi chỗ trong cùng một lần commit, không có khung hình nào cả hai cùng mở. `handoff` (true tới khi giỏ đóng) bật chế độ
 * chuyển cảnh của `StorefrontDrawer` (lớp phủ không chớp, giỏ nằm trên). Focus: yêu thích không trả focus (giỏ vừa nhận); khi đóng giỏ, `cartFinalFocus` trả focus về NÚT ĐÃ MỞ yêu thích (tim ở header
 * hoặc mục ở thanh bên) nếu nó còn trong trang, không thì để Base UI tự xử lý. Esc chỉ đóng giỏ, vì yêu thích đã đóng.
 */
export function useWishlistWiring(requireLogin: ReturnType<typeof useRequireLogin>, cartOpen: boolean) {
  const isCustomer = useCurrentRole() === "CUSTOMER"
  const wishlist = useToggleWishlist({ enabled: isCustomer })
  const [open, setOpen] = useOpenUntilNavigation()
  const [handoff, setHandoff] = useState(false)
  const openerRef = useRef<HTMLElement | null>(null)
  const returnTargetRef = useRef<HTMLElement | null>(null)
  if (cartOpen && open) {
    setOpen(false)
    setHandoff(true)
  } else if (!cartOpen && handoff) {
    setHandoff(false)
  }
  useEffect(() => {
    if (handoff) returnTargetRef.current = openerRef.current
  }, [handoff])
  const gate = (action: () => void) => requireLogin(action, { guest: WISHLIST_MESSAGES.guest, admin: WISHLIST_MESSAGES.admin })

  const { isPending, toggle } = wishlist
  const ui = {
    isFavorite: (productId: number) => isCustomer && wishlist.isFavorite(productId),
    isPending: (productId: number) => isCustomer && isPending(productId),
    toggle: (productId: number) => gate(() => toggle(productId)),
    openWishlist: () =>
      gate(() => {
        openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        setOpen(true)
      }),
  }
  const count = isCustomer ? wishlist.ids.length : 0
  // Dùng một lần: lần đóng giỏ đầu tiên sau chuyển cảnh. Luôn được truyền cho giỏ (lúc đóng `handoff` đã về false); không có đích thì trả `true` = Base UI trả focus như mặc định, y như khi không truyền.
  const cartFinalFocus = () => {
    const target = returnTargetRef.current
    returnTargetRef.current = null
    return target?.isConnected ? target : true
  }

  return { isCustomer, count, open, setOpen, handoff, cartFinalFocus, ui, isPending: ui.isPending, onRemove: toggle }
}
