import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { OrderStatusBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/format"
import { useListPath } from "../list-link"
import type { AdminOrder } from "../types"

/** Đầu trang chi tiết: về danh sách (giữ bộ lọc), mã đơn, thời điểm đặt và nhãn trạng thái. */
function OrderDetailHeader({ order }: { order: AdminOrder }) {
  const listPath = useListPath()
  return (
    <div className="flex flex-col gap-stack border-b border-border-subtle pb-stack">
      <Button variant="ghost" size="sm" className="w-fit" nativeButton={false} render={<Link to={listPath} />}>
        <ArrowLeft />
        Danh sách đơn hàng
      </Button>
      <div className="flex flex-wrap items-center gap-x-inline gap-y-1">
        <h1 data-numeric className="font-display text-h1 uppercase text-ink">
          {order.code}
        </h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="text-body-sm text-ink-muted">Đặt lúc {formatDateTime(order.createdAt)}</p>
    </div>
  )
}

export { OrderDetailHeader }
