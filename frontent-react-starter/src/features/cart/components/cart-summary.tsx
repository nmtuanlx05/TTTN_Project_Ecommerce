import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"
import { formatVnd } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Cart } from "../types"
import { CheckoutButton } from "./checkout-button"
import { FreeShippingBar } from "./free-shipping-bar"

/**
 * Thẻ tóm tắt bên phải trang /gio-hang: nền be bo `panel` (cùng thẻ thông tin ở trang chi tiết). Chỉ tạm tính và dải miễn phí vận chuyển; KHÔNG có phí vận chuyển cụ thể hay mã giảm giá
 * (chưa làm). Từ `lg` thẻ dính dưới header. "Thanh toán ngay" dẫn tới /thanh-toan.
 */
function CartSummary({ cart }: { cart: Cart }) {
  return (
    <aside
      aria-label="Tóm tắt giỏ hàng"
      className="flex flex-col gap-5 self-start rounded-panel bg-surface-sunken/50 p-6 sm:p-8 lg:sticky lg:top-(--sticky-top)"
    >
      <h2 className="text-h3 font-semibold text-ink">Tóm tắt</h2>
      <dl className="flex flex-col gap-2 text-body-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Số sản phẩm</dt>
          <dd className="text-ink">{cart.itemCount}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink">Tạm tính</dt>
          <dd className="text-h3 font-semibold text-ink">{formatVnd(cart.subtotal)}</dd>
        </div>
      </dl>
      <FreeShippingBar subtotal={cart.subtotal} />
      <p className="text-caption text-ink-muted">Phí vận chuyển được tính ở bước thanh toán.</p>
      <CheckoutButton disabled={cart.itemCount === 0} />
      <Link to="/products" className={cn(buttonVariants({ variant: "ghost" }), "press self-center underline underline-offset-4")}>
        Tiếp tục mua sắm
      </Link>
    </aside>
  )
}

export { CartSummary }
