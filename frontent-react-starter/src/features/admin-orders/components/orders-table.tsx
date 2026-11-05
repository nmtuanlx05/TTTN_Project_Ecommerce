import { Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { OrderStatusBadge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime, formatNumber, formatVnd } from "@/lib/format"
import { listLinkState } from "../list-link"
import type { AdminOrderListItem } from "../types"
import { OrderPaymentCell } from "./order-payment-cell"

/** Cột "Số sản phẩm" là tổng số lượng các dòng hàng. */
const countItems = (order: AdminOrderListItem) => order.items.reduce((sum, item) => sum + item.quantity, 0)

function OrdersTable({ orders }: { orders: AdminOrderListItem[] }) {
  const { search } = useLocation()
  return (
    <Table className="min-w-5xl">
      <TableHeader>
        <TableRow>
          <TableHead>Mã đơn</TableHead>
          <TableHead>Khách hàng</TableHead>
          <TableHead>Ngày đặt</TableHead>
          <TableHead className="text-right">Số sản phẩm</TableHead>
          <TableHead className="text-right">Tổng tiền</TableHead>
          <TableHead>Thanh toán</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>
            <span className="sr-only">Thao tác</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell data-numeric className="whitespace-nowrap font-medium text-ink">
              {order.code}
            </TableCell>
            <TableCell>
              <div className="font-medium text-ink">{order.customerName}</div>
              <div data-numeric className="text-ink-muted">
                {order.customerPhone}
              </div>
            </TableCell>
            <TableCell className="whitespace-nowrap text-ink-muted">{formatDateTime(order.createdAt)}</TableCell>
            <TableCell data-numeric className="text-right">
              {formatNumber(countItems(order))}
            </TableCell>
            <TableCell data-numeric className="text-right whitespace-nowrap">
              {formatVnd(order.totalAmount)}
            </TableCell>
            <TableCell>
              <OrderPaymentCell method={order.paymentMethod} status={order.paymentStatus} />
            </TableCell>
            <TableCell>
              <OrderStatusBadge status={order.status} />
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                aria-label={`Xem chi tiết đơn ${order.code}`}
                render={<Link to={`/admin/orders/${order.id}`} state={listLinkState(search)} />}
              >
                Xem chi tiết
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { OrdersTable }
