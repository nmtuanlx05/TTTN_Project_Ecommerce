import { Link } from "react-router-dom"
import { OrderStatusBadge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/format"
import type { OrderStatusCount } from "../mock"

/**
 * Bảy trạng thái đơn, mỗi dòng là một liên kết sang danh sách đã lọc sẵn.
 * Thanh tỉ lệ chỉ là nền của dòng — nó lặp lại con số bên cạnh nên không cần
 * nhãn riêng, và được đánh dấu aria-hidden để trình đọc màn hình không đọc hai lần.
 */
function StatusBreakdown({ statusCounts }: { statusCounts: OrderStatusCount[] }) {
  const max = Math.max(...statusCounts.map((item) => item.count), 1)
  const total = statusCounts.reduce((sum, item) => sum + item.count, 0)

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
          Tổng {formatNumber(total)} đơn trong kỳ
        </p>
      </div>

      <ul className="flex flex-col gap-0.5">
        {statusCounts.map((item) => (
          <li key={item.status}>
            <Link
              to={`/admin/orders?status=${item.status}`}
              className="group relative flex items-center justify-between gap-inline overflow-hidden rounded-xs px-2 py-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-surface-sunken transition-[width]"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
              <span className="absolute inset-0 bg-transparent transition-colors group-hover:bg-surface-hover" />
              <span className="relative">
                <OrderStatusBadge status={item.status} />
              </span>
              <span
                data-numeric
                className="relative text-body-sm font-medium text-ink"
              >
                {formatNumber(item.count)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function StatusBreakdownSkeleton() {
  return (
    <div className="flex flex-col gap-stack rounded-md border border-border-subtle bg-surface p-card">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: 7 }, (_, index) => (
        <Skeleton key={index} className="h-8 w-full" />
      ))}
    </div>
  )
}

export { StatusBreakdown, StatusBreakdownSkeleton }
