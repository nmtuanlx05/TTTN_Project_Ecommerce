import type { ReactNode } from "react"
import { formatVnd } from "@/lib/format"
import type { AdminOrder } from "../types"

function Line({ label, children, strong = false }: { label: ReactNode; children: ReactNode; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between gap-inline border-t border-border-subtle pt-stack text-body text-ink" : "flex justify-between gap-inline text-body-sm text-ink-muted"}>
      <dt className={strong ? "font-semibold" : undefined}>{label}</dt>
      <dd data-numeric className={strong ? "font-semibold" : "text-ink"}>
        {children}
      </dd>
    </div>
  )
}

/** Tiền do backend tính và lưu trên đơn (`tổng = tạm tính − giảm giá + phí vận chuyển`); giao diện chỉ hiển thị. */
function OrderTotalsCard({ order }: { order: AdminOrder }) {
  return (
    <section aria-labelledby="order-totals" className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card">
      <h2 id="order-totals" className="font-display text-h3 text-ink">
        Tiền
      </h2>
      <dl className="flex flex-col gap-stack">
        <Line label="Tạm tính">{formatVnd(order.subtotal)}</Line>
        <Line label={order.voucherCode ? `Giảm giá (mã ${order.voucherCode})` : "Giảm giá"}>
          {order.discountAmount > 0 ? `−${formatVnd(order.discountAmount)}` : formatVnd(0)}
        </Line>
        <Line label="Phí vận chuyển">{order.shippingFee === 0 ? "Miễn phí" : formatVnd(order.shippingFee)}</Line>
        <Line label="Tổng cộng" strong>
          {formatVnd(order.totalAmount)}
        </Line>
      </dl>
    </section>
  )
}

export { OrderTotalsCard }
