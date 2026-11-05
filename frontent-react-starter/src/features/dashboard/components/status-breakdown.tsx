import { Link } from "react-router-dom"
import { OrderStatusBadge, type OrderStatus } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/format"
import type { DateRange } from "@/lib/date-range"
import type { OrderStatusCount } from "../types"

/** Danh sách đơn admin chỉ lọc được 5 trạng thái này (STATUS_TABS); hai trạng thái còn lại không link để khỏi dẫn sai. */
const LINKABLE: Record<OrderStatus, boolean> = {
  PENDING: true,
  PENDING_PAYMENT: false,
  CONFIRMED: true,
  SHIPPING: true,
  COMPLETED: true,
  CANCELLED: true,
  RETURNED: false,
}

/** Chưa dùng ở bản này nên ẩn khi bằng 0; các trạng thái khác luôn hiện kể cả 0. */
const HIDE_WHEN_ZERO: Record<OrderStatus, boolean> = {
  PENDING: false,
  PENDING_PAYMENT: true,
  CONFIRMED: false,
  SHIPPING: false,
  COMPLETED: false,
  CANCELLED: false,
  RETURNED: true,
}

/**
 * Mỗi dòng (trừ hai trạng thái chưa lọc được) là liên kết sang danh sách đơn đã lọc theo trạng thái VÀ khoảng
 * ngày đang xem; số đếm tính theo ngày đặt nên khớp với danh sách. Thanh tỉ lệ chỉ là nền của dòng nên aria-hidden.
 */
function StatusBreakdown({
  statusCounts,
  range,
}: {
  statusCounts: OrderStatusCount[]
  range: DateRange
}) {
  const max = Math.max(...statusCounts.map((item) => item.count), 1)
  const total = statusCounts.reduce((sum, item) => sum + item.count, 0)
  const rows = statusCounts.filter((item) => item.count > 0 || !HIDE_WHEN_ZERO[item.status])
  const rowClass =
    "group relative flex items-center justify-between gap-inline overflow-hidden rounded-xs px-2 py-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

  return (
    <section
      aria-labelledby="status-breakdown-title"
      className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card"
    >
      <div>
        <h2 id="status-breakdown-title" className="font-display text-h3 text-ink">
          Đơn theo trạng thái
        </h2>
        <p className="mt-0.5 text-caption text-ink-muted">
          Tổng {formatNumber(total)} đơn đặt trong kỳ
        </p>
      </div>

      <ul className="flex flex-col gap-0.5">
        {rows.map((item) => {
          const inner = (
            <>
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-surface-sunken transition-[width]"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
              {LINKABLE[item.status] ? (
                <span className="absolute inset-0 bg-transparent transition-colors group-hover:bg-surface-hover" />
              ) : null}
              <span className="relative">
                <OrderStatusBadge status={item.status} />
              </span>
              <span data-numeric className="relative text-body-sm font-medium text-ink">
                {formatNumber(item.count)}
              </span>
            </>
          )
          return (
            <li key={item.status}>
              {LINKABLE[item.status] ? (
                <Link
                  to={`/admin/orders?status=${item.status}&from=${range.from}&to=${range.to}`}
                  className={rowClass}
                >
                  {inner}
                </Link>
              ) : (
                <div className={rowClass}>{inner}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function StatusBreakdownSkeleton() {
  return (
    <div className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-8 w-full" />
      ))}
    </div>
  )
}

export { StatusBreakdown, StatusBreakdownSkeleton }
