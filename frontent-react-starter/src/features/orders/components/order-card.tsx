import { Link } from "react-router-dom"
import { Button, buttonVariants } from "@/components/ui/button"
import { formatDate, formatTime, formatVnd } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PAYMENT_METHOD_LABEL, orderDetailPath } from "../constants"
import type { OrderListItem } from "../types"
import { OrderStatusPill } from "./order-status-pill"
import { OrderThumb } from "./order-thumb"

const MAX_THUMBS = 4

/** Chữ "Đã thanh toán" dạng viên thuốc xanh lá (chỉ khi `paymentStatus` là PAID). */
function PaidPill() {
  return (
    <span className="inline-flex w-fit items-center rounded-4xl bg-success-tint px-3 py-0.5 text-caption font-medium text-success-fg">
      Đã thanh toán
    </span>
  )
}

/**
 * Thẻ một đơn trong danh sách: mã + ngày (GMT+7) + viên trạng thái; hàng ảnh nhỏ (huy hiệu tròn = số lượng, quá 4 dòng thì "+N") và tên sản phẩm;
 * dưới đường kẻ: thanh toán, tổng cộng, nút. Nút chính theo trạng thái: PENDING "Hủy đơn" (nơi gọi mở hộp xác nhận), CONFIRMED/SHIPPING
 * "Theo dõi đơn", COMPLETED/CANCELLED "Mua lại". "Xem chi tiết" luôn có. Không có "Thanh toán ngay" (chưa hỗ trợ thanh toán online).
 */
function OrderCard({
  order,
  busy,
  onCancel,
  onReorder,
}: {
  order: OrderListItem
  /** Đang mua lại đúng đơn này. */
  busy: boolean
  onCancel: (order: OrderListItem) => void
  onReorder: (order: OrderListItem) => void
}) {
  const { items, status } = order
  const shown = items.slice(0, MAX_THUMBS)
  const extra = items.length - shown.length
  const detail = orderDetailPath(order.code)
  const actionClass = "press rounded-4xl"

  let primary: React.ReactNode = null
  if (status === "PENDING") {
    primary = (
      <Button type="button" onClick={() => onCancel(order)} className={actionClass}>
        Hủy đơn
      </Button>
    )
  } else if (status === "CONFIRMED" || status === "SHIPPING") {
    primary = (
      <Link to={detail} className={cn(buttonVariants(), actionClass)}>
        Theo dõi đơn
      </Link>
    )
  } else if (status === "COMPLETED" || status === "CANCELLED") {
    primary = (
      <Button type="button" loading={busy} onClick={() => onReorder(order)} className={actionClass}>
        Mua lại
      </Button>
    )
  }

  return (
    <article aria-label={`Đơn ${order.code}`} className="flex flex-col gap-5 rounded-panel border border-border-subtle bg-surface-raised p-card">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-body font-semibold text-ink">
            Đơn <span data-numeric>{order.code}</span>
          </h2>
          <p className="text-body-sm text-ink-muted">
            Đặt ngày {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
          </p>
        </div>
        <OrderStatusPill status={status} />
      </header>

      <div className="flex items-center gap-4">
        <ul className="flex shrink-0 gap-2">
          {shown.map((item, index) => (
            <li key={index} className="relative">
              <OrderThumb src={item.imageUrl} className="size-14" />
              <span
                aria-hidden="true"
                className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-4xl bg-primary px-1 text-caption leading-none font-semibold text-primary-fg"
              >
                {item.quantity}
              </span>
            </li>
          ))}
          {extra > 0 ? (
            <li aria-hidden="true" className="grid size-14 place-items-center rounded-card bg-surface-sunken text-body-sm font-medium text-ink-muted">
              +{extra}
            </li>
          ) : null}
        </ul>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-body-sm font-medium text-ink">{items.map((item) => item.productName).join(", ")}</p>
          <p className="text-body-sm text-ink-muted">{order.itemCount} sản phẩm</p>
        </div>
      </div>

      <footer className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-border-subtle pt-5">
        <div className="flex flex-col items-start gap-2">
          <p className="text-body-sm text-ink-muted">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
          {order.paymentStatus === "PAID" ? <PaidPill /> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-3">
          <p className="flex flex-col text-right">
            <span className="text-caption text-ink-muted">Tổng cộng</span>
            <span data-numeric className="text-h3 font-semibold text-ink">
              {formatVnd(order.totalAmount)}
            </span>
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Link to={detail} className={cn(buttonVariants({ variant: "secondary" }), actionClass)}>
              Xem chi tiết
            </Link>
            {primary}
          </div>
        </div>
      </footer>
    </article>
  )
}

export { OrderCard, PaidPill }
