import { Check, CircleX, Clock } from "lucide-react"
import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"
import { formatDate, formatTime, formatVnd } from "@/lib/format"
import { accountOrderPath } from "@/lib/order-paths"
import { cn } from "@/lib/utils"
import type { OrderPayment } from "../types"

const COPY = {
  PAID: {
    eyebrow: "Thanh toán thành công",
    title: "Cảm ơn bạn đã thanh toán",
    description: "Cửa hàng đã nhận được tiền và sẽ xác nhận đơn hàng của bạn trong thời gian sớm nhất.",
  },
  EXPIRED: {
    eyebrow: "Đơn đã hết hạn thanh toán",
    title: "Hết thời gian thanh toán",
    description:
      "Đơn hàng đã bị hủy và hàng đã được nhả lại. Nếu bạn lỡ chuyển khoản, vui lòng liên hệ cửa hàng kèm mã đơn để được hỗ trợ hoàn tiền.",
  },
  CANCELLED: {
    eyebrow: "Đơn đã bị hủy",
    title: "Đơn hàng đã bị hủy",
    description:
      "Đơn này không còn nhận thanh toán. Nếu bạn đã chuyển khoản, vui lòng liên hệ cửa hàng kèm mã đơn để được hỗ trợ hoàn tiền.",
  },
} as const

/** Kết quả cuối của trang thanh toán: PAID (thành công, link xem đơn), EXPIRED/CANCELLED (thông báo, quay lại cửa hàng). */
function PaymentResult({ payment, state }: { payment: OrderPayment; state: "PAID" | "EXPIRED" | "CANCELLED" }) {
  const copy = COPY[state]
  const Icon = state === "PAID" ? Check : state === "EXPIRED" ? Clock : CircleX
  return (
    <section
      aria-labelledby="payment-result-title"
      className="mx-auto flex max-w-xl flex-col items-center gap-6 rounded-panel border border-border-subtle bg-surface-raised p-6 text-center sm:p-10"
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-14 place-items-center rounded-4xl",
          state === "PAID" ? "bg-primary text-primary-fg" : "bg-surface-sunken text-ink-muted",
        )}
      >
        <Icon className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <p className="font-serif text-h3 font-normal text-ink-muted italic">{copy.eyebrow}</p>
        <h1 id="payment-result-title" className="text-h1 text-ink uppercase">
          {copy.title}
        </h1>
        <p className="mx-auto max-w-prose text-body-sm text-ink-muted">{copy.description}</p>
      </div>
      <dl className="flex w-full flex-col gap-2 border-t border-border-subtle pt-6 text-left text-body-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Mã đơn</dt>
          <dd data-numeric className="font-medium text-ink">
            {payment.orderCode}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Số tiền</dt>
          <dd data-numeric className="font-medium text-ink">
            {formatVnd(payment.amount)}
          </dd>
        </div>
        {state === "PAID" && payment.paidAt ? (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Thanh toán lúc</dt>
            <dd className="text-ink">
              {formatTime(payment.paidAt)} ngày {formatDate(payment.paidAt)}
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="flex flex-wrap justify-center gap-3">
        {state === "PAID" ? (
          <Link to={accountOrderPath(payment.orderCode)} className={cn(buttonVariants({ size: "lg" }), "press rounded-4xl")}>
            Xem đơn hàng
          </Link>
        ) : null}
        <Link
          to="/products"
          className={cn(buttonVariants({ size: "lg", variant: state === "PAID" ? "secondary" : "primary" }), "press rounded-4xl")}
        >
          Tiếp tục mua sắm
        </Link>
        {state !== "PAID" ? (
          <Link to={accountOrderPath(payment.orderCode)} className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "press rounded-4xl")}>
            Xem đơn hàng
          </Link>
        ) : null}
      </div>
    </section>
  )
}

export { PaymentResult }
