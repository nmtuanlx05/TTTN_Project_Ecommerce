import { Link } from "react-router-dom"
import { Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTime, formatVnd } from "@/lib/format"
import type { PendingOrder } from "@/lib/mock/dashboard"

function RecentOrders({ orders }: { orders: PendingOrder[] }) {
  return (
    <section
      aria-labelledby="recent-orders-title"
      className="flex flex-col gap-stack"
    >
      <div className="flex flex-wrap items-end justify-between gap-inline">
        <div>
          <h2 id="recent-orders-title" className="font-display text-h2 uppercase text-ink">
            Đơn mới cần xử lý
          </h2>
          <p className="mt-0.5 text-caption text-ink-muted">
            Đơn chưa giao, mới nhất lên trước
          </p>
        </div>
        <Button variant="secondary" size="sm" render={<Link to="/admin/orders" />}>
          Xem tất cả đơn
        </Button>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Chưa có đơn nào cần xử lý"
          description="Đơn mới sẽ hiện ở đây ngay khi khách đặt."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead className="text-right">Tổng cộng</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thanh toán</TableHead>
              <TableHead className="text-right">Đặt lúc</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    to={`/admin/orders/${order.code}`}
                    data-numeric
                    className="rounded-xs text-ink underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {order.code}
                  </Link>
                </TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell data-numeric className="text-right">
                  {formatVnd(order.totalAmount)}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </TableCell>
                <TableCell data-numeric className="text-right text-ink-muted">
                  {formatTime(order.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

function RecentOrdersSkeleton() {
  return (
    <div className="flex flex-col gap-stack">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export { RecentOrders, RecentOrdersSkeleton }
