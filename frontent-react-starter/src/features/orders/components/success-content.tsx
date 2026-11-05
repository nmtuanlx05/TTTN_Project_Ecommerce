import { Check } from "lucide-react"
import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { orderDetailPath } from "../constants"
import type { Order } from "../types"
import { SuccessRows } from "./success-rows"

/** Thẻ giữa trang "Cảm ơn bạn đã đặt hàng": dấu tích đen, tiêu đề, mô tả, thông tin đơn, hai nút. */
function SuccessContent({ order }: { order: Order }) {
  return (
    <section
      aria-labelledby="order-success-title"
      className="mx-auto flex max-w-xl flex-col items-center gap-6 rounded-panel border border-border-subtle bg-surface-raised p-6 text-center sm:p-10"
    >
      <span aria-hidden="true" className="grid size-14 place-items-center rounded-4xl bg-primary text-primary-fg">
        <Check className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <p className="font-serif text-h3 font-normal text-ink-muted italic">Đặt hàng thành công</p>
        <h1 id="order-success-title" className="text-h1 text-ink uppercase">
          Cảm ơn bạn đã đặt hàng
        </h1>
        <p className="mx-auto max-w-prose text-body-sm text-ink-muted">
          Chúng tôi đã nhận được đơn hàng và sẽ liên hệ xác nhận với bạn trong thời gian sớm nhất.
        </p>
      </div>
      <div className="w-full border-t border-border-subtle pt-6 text-left">
        <SuccessRows order={order} />
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/products" className={cn(buttonVariants({ size: "lg" }), "press rounded-4xl")}>
          Tiếp tục mua sắm
        </Link>
        <Link to="/" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "press rounded-4xl")}>
          Về trang chủ
        </Link>
      </div>
      <Link
        to={orderDetailPath(order.code)}
        className="inline-flex min-h-control items-center text-body-sm text-ink-muted underline underline-offset-4 hover:text-ink"
      >
        Xem chi tiết đơn hàng
      </Link>
    </section>
  )
}

export { SuccessContent }
