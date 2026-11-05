import { useEffect, useState, type ComponentProps } from "react"
import { StorefrontDrawer } from "@/components/storefront/storefront-drawer"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCart, useRefreshCart } from "../queries"
import { CartDrawerFooter } from "./cart-drawer-footer"
import { CartDrawerHeader } from "./cart-drawer-header"
import { CartEmpty, CartError, CartSkeleton } from "./cart-states"
import { CartLineList } from "./cart-line-list"
import { FreeShippingBar } from "./free-shipping-bar"

/**
 * Ngăn kéo giỏ hàng (trượt từ phải). Chỉ dựng cho CUSTOMER nên `useCart` luôn bật. Render trong portal NGOÀI `<main>` nên không có `.soft-ui`: tự gắn lên panel để
 * bo góc và hover đảo màu của nút đúng như trang. Mở ngăn kéo thì làm mới giỏ nền: đã có cache thì hiện luôn (không khung chờ, không nháy), cập nhật khi dữ liệu mới về;
 * chỉ khi CHƯA có dữ liệu mà lỗi mới hiện nút "Thử lại". Danh sách cuộn, đầu và chân cố định. Vùng `aria-live` đọc thông báo xóa dòng.
 */
function CartDrawer({
  open,
  onOpenChange,
  handoffIn = false,
  finalFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Giỏ vừa được mở từ ngăn kéo khác (yêu thích): chuyển cảnh liền mạch, xem `DrawerHandoff`. Mặc định tắt, ngăn kéo hoạt động y như cũ. */
  handoffIn?: boolean
  /** Nơi nhận focus khi đóng giỏ; chỉ truyền khi giỏ mở từ ngăn kéo khác (mặc định về phần tử đã mở). */
  finalFocus?: ComponentProps<typeof StorefrontDrawer>["finalFocus"]
}) {
  const { data: cart, isError, refetch } = useCart({ enabled: true })
  const refresh = useRefreshCart()
  const [announcement, setAnnouncement] = useState("")

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  const close = () => onOpenChange(false)
  const empty = cart !== undefined && cart.items.length === 0

  let body
  if (cart && cart.items.length > 0) {
    body = (
      <CartLineList items={cart.items} unavailableCount={cart.unavailableCount} size="sm" onAnnounce={setAnnouncement} />
    )
  } else if (empty) {
    body = (
      <CartEmpty
        action={
          <Button type="button" onClick={close} className="press">
            Tiếp tục mua sắm
          </Button>
        }
      />
    )
  } else if (isError) {
    body = <CartError onRetry={() => void refetch()} />
  } else {
    body = <CartSkeleton />
  }

  return (
    <StorefrontDrawer
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      title="Giỏ hàng của bạn"
      hideHeader
      titleInChildren
      handoff={handoffIn ? "in" : undefined}
      finalFocus={finalFocus}
      className="soft-ui w-full max-w-none sm:max-w-[27rem] sm:rounded-l-panel"
    >
      <CartDrawerHeader itemCount={cart ? cart.itemCount : null} />
      {cart && !empty ? <FreeShippingBar subtotal={cart.subtotal} className="border-b border-border-subtle px-gutter pb-4" /> : null}
      <div className={cn("scrollbar-soft min-h-0 flex-1 overflow-y-auto px-gutter", empty && "flex flex-col justify-center")}>{body}</div>
      {cart && !empty ? <CartDrawerFooter subtotal={cart.subtotal} canCheckout={cart.itemCount > 0} onNavigate={close} /> : null}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </StorefrontDrawer>
  )
}

export { CartDrawer }
