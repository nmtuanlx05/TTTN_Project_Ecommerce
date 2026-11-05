import { formatVnd } from "@/lib/format"
import { formatAddress } from "../format-address"
import type { Order } from "../types"

const PAYMENT_LABEL = {
  COD: "Thanh toán khi nhận hàng (COD)",
  ONLINE: "Thanh toán online",
} as const

function Row({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="flex justify-between gap-6 text-body-sm">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd data-numeric={numeric || undefined} className="text-right font-medium text-ink">
        {value}
      </dd>
    </div>
  )
}

/** Các dòng thông tin đơn vừa đặt và Tổng cộng (số liệu lấy từ đơn đã lưu, không tính lại). */
function SuccessRows({ order }: { order: Order }) {
  const { shippingAddress: address } = order
  return (
    <dl className="flex flex-col gap-3">
      <Row label="Mã đơn hàng" value={order.code} numeric />
      <Row label="Người nhận" value={`${address.receiverName} · ${address.phone}`} />
      <Row label="Giao tới" value={formatAddress(address)} />
      <Row label="Thanh toán" value={PAYMENT_LABEL[order.paymentMethod]} />
      <div className="mt-1 flex items-baseline justify-between gap-6 border-t border-border-subtle pt-4">
        <dt className="font-semibold text-ink">Tổng cộng</dt>
        <dd data-numeric className="text-h2 font-semibold text-ink">
          {formatVnd(order.totalAmount)}
        </dd>
      </div>
    </dl>
  )
}

export { SuccessRows }
