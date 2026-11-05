import { Badge, PaymentStatusBadge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/format"
import { PAYMENT_METHOD_LABEL } from "../constants"
import type { AdminOrder } from "../types"

/** Khối thanh toán: phương thức, trạng thái, thời điểm thanh toán (đơn COD được ghi đã thanh toán khi hoàn tất giao hàng). */
function OrderPaymentCard({ order }: { order: AdminOrder }) {
  return (
    <section aria-labelledby="order-payment" className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card">
      <h2 id="order-payment" className="font-display text-h3 text-ink">
        Thanh toán
      </h2>
      <dl className="flex flex-col gap-stack">
        <div className="flex flex-col gap-0.5">
          <dt className="text-caption text-ink-muted">Phương thức</dt>
          <dd className="text-body-sm text-ink">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</dd>
        </div>
        <div className="flex flex-col items-start gap-0.5">
          <dt className="text-caption text-ink-muted">Trạng thái</dt>
          <dd>
            {order.paymentStatus === "FAILED" ? (
              <Badge variant="unpaid">Thanh toán lỗi</Badge>
            ) : (
              <PaymentStatusBadge status={order.paymentStatus} />
            )}
          </dd>
        </div>
        {order.paidAt ? (
          <div className="flex flex-col gap-0.5">
            <dt className="text-caption text-ink-muted">Thanh toán lúc</dt>
            <dd className="text-body-sm text-ink">{formatDateTime(order.paidAt)}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}

export { OrderPaymentCard }
