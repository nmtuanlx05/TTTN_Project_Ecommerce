import { RotateCw } from "lucide-react"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { useAdminOrder } from "../queries"
import type { AdminOrder } from "../types"
import { useOrderStatusAction } from "../use-order-status-action"
import { OrderActionsPanel } from "./order-actions-panel"
import { OrderCustomerCard } from "./order-customer-card"
import { OrderDetailHeader } from "./order-detail-header"
import { OrderDetailSkeleton } from "./order-detail-skeleton"
import { OrderHistoryList } from "./order-history-list"
import { OrderItemsTable } from "./order-items-table"
import { OrderNotFound } from "./order-not-found"
import { OrderPaymentCard } from "./order-payment-card"
import { OrderStatusDialogs } from "./order-status-dialogs"
import { OrderTotalsCard } from "./order-totals-card"

function OrderLoaded({ order }: { order: AdminOrder }) {
  const action = useOrderStatusAction(order)
  useDocumentTitle(`Đơn ${order.code}`)
  return (
    <div className="flex flex-col gap-section">
      <OrderDetailHeader order={order} />
      <OrderActionsPanel status={order.status} loading={action.loading} onAction={action.request} />
      <div className="grid gap-stack lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-section">
          <OrderCustomerCard order={order} />
          <OrderItemsTable items={order.items} />
          <OrderHistoryList history={order.history} />
        </div>
        <div className="flex flex-col gap-stack">
          <OrderTotalsCard order={order} />
          <OrderPaymentCard order={order} />
        </div>
      </div>
      <OrderStatusDialogs code={order.code} action={action} />
    </div>
  )
}

/** Tải chi tiết rồi chọn skeleton, 404, lỗi có nút thử lại hoặc trang đầy đủ. */
function OrderDetailContent({ id }: { id: number }) {
  const { data, error, isPending, isError, isFetching, refetch } = useAdminOrder(id)

  if (isPending) return <OrderDetailSkeleton />
  if (isError && error.statusCode === 404) return <OrderNotFound />
  if (!data) {
    return (
      <Alert variant="danger" title="Không tải được đơn hàng">
        <p>{error?.message}</p>
        <Button variant="secondary" size="sm" className="mt-2" loading={isFetching} onClick={() => refetch()}>
          <RotateCw />
          Thử lại
        </Button>
      </Alert>
    )
  }
  return <OrderLoaded order={data} />
}

export { OrderDetailContent }
