import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"
import { formatVnd } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CheckoutButton } from "./checkout-button"

/**
 * Chân ngăn kéo (cố định, không cuộn theo danh sách): tạm tính, chú thích phí vận chuyển, hai nút. "Thanh toán ngay" dẫn tới /thanh-toan (`CheckoutButton`), bấm thì đóng ngăn kéo.
 */
function CartDrawerFooter({
  subtotal,
  canCheckout,
  onNavigate,
}: {
  subtotal: number
  canCheckout: boolean
  /** Bấm "Xem giỏ hàng chi tiết": đóng ngăn kéo (đang ở /gio-hang thì pathname không đổi nên không tự đóng). */
  onNavigate: () => void
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border-subtle p-gutter pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body-sm text-ink">Tạm tính</span>
        <span className="text-h3 font-semibold text-ink">{formatVnd(subtotal)}</span>
      </div>
      <p className="text-caption text-ink-muted">Phí vận chuyển được tính ở bước thanh toán.</p>
      <Link
        to="/gio-hang"
        onClick={onNavigate}
        className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "press rounded-4xl")}
      >
        Xem giỏ hàng chi tiết
      </Link>
      <CheckoutButton disabled={!canCheckout} onNavigate={onNavigate} />
    </div>
  )
}

export { CartDrawerFooter }
