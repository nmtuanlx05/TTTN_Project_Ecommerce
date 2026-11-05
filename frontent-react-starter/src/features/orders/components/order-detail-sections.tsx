import type { ReactNode } from "react"
import { formatDate, formatTime, formatVnd } from "@/lib/format"
import { PAYMENT_METHOD_LABEL } from "../constants"
import { formatAddress } from "../format-address"
import type { Order } from "../types"
import { PaidPill } from "./order-card"
import { OrderThumb } from "./order-thumb"

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-panel border border-border-subtle bg-surface-raised p-card">
      <h2 className="text-h3 font-semibold text-ink">{title}</h2>
      {children}
    </section>
  )
}

function MoneyRow({ label, value, strong }: { label: ReactNode; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex items-baseline justify-between gap-4 border-t border-border-subtle pt-4" : "flex justify-between gap-4 text-body-sm"}>
      <dt className={strong ? "font-semibold text-ink" : "text-ink-muted"}>{label}</dt>
      <dd data-numeric className={strong ? "text-h3 font-semibold text-ink" : "text-ink"}>
        {value}
      </dd>
    </div>
  )
}

/** Các dòng hàng: ảnh, tên, màu · size, số lượng, giá, thành tiền (dữ liệu chụp lúc đặt). */
function OrderItemsCard({ order }: { order: Order }) {
  return (
    <Card title="Sản phẩm">
      <ul className="flex flex-col divide-y divide-border-subtle">
        {order.items.map((item, index) => (
          <li key={index} className="flex gap-4 py-4 first:pt-0 last:pb-0">
            <OrderThumb src={item.imageUrl} className="size-16" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-body-sm font-medium text-ink">{item.productName}</p>
              <p className="text-body-sm text-ink-muted">
                {item.color} · {item.size}
              </p>
              <p data-numeric className="text-body-sm text-ink-muted">
                {formatVnd(item.price)} × {item.quantity}
              </p>
            </div>
            <p data-numeric className="text-body-sm font-semibold text-ink">
              {formatVnd(item.lineTotal)}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Địa chỉ nhận hàng, thanh toán và khối tiền (số liệu lấy từ đơn đã lưu, không tính lại). */
function OrderSideCards({ order }: { order: Order }) {
  const { shippingAddress: address } = order
  return (
    <>
      <Card title="Địa chỉ nhận hàng">
        <address className="flex flex-col gap-1 text-body-sm text-ink not-italic">
          <span className="font-medium">{address.receiverName}</span>
          <span data-numeric className="text-ink-muted">{address.phone}</span>
          <span className="text-ink-muted">{formatAddress(address)}</span>
          {address.note ? <span className="text-ink-muted">Ghi chú: {address.note}</span> : null}
        </address>
      </Card>
      <Card title="Thanh toán">
        <div className="flex flex-col items-start gap-2 text-body-sm">
          <p className="text-ink">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
          {order.paymentStatus === "PAID" ? (
            <>
              <PaidPill />
              {order.paidAt ? (
                <p className="text-ink-muted">
                  Lúc {formatTime(order.paidAt)} ngày {formatDate(order.paidAt)}
                </p>
              ) : null}
            </>
          ) : (
            <span className="inline-flex rounded-4xl border border-border-strong px-3 py-0.5 text-caption font-medium text-ink-muted">
              Chưa thanh toán
            </span>
          )}
        </div>
      </Card>
      <Card title="Tổng tiền">
        <dl className="flex flex-col gap-3">
          <MoneyRow label="Tạm tính" value={formatVnd(order.subtotal)} />
          {order.discountAmount > 0 ? (
            <MoneyRow
              label={order.voucherCode ? `Giảm giá (${order.voucherCode})` : "Giảm giá"}
              value={`−${formatVnd(order.discountAmount)}`}
            />
          ) : null}
          <MoneyRow label="Phí vận chuyển" value={order.shippingFee === 0 ? "Miễn phí" : formatVnd(order.shippingFee)} />
          <MoneyRow strong label="Tổng cộng" value={formatVnd(order.totalAmount)} />
        </dl>
      </Card>
    </>
  )
}

export { Card, OrderItemsCard, OrderSideCards }
