import { CircleAlert } from "lucide-react"
import { StateMessage } from "@/components/storefront/state-message"
import { Link } from "react-router-dom"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatTime } from "@/lib/format"
import { orderPaymentPath } from "@/lib/order-paths"
import { cn } from "@/lib/utils"
import { canCustomerCancel, canPayNow } from "../constants"
import { useOrderActions } from "../use-order-actions"
import { useOrder } from "../queries"
import { OrderActionDialogs } from "./order-action-dialogs"
import { OrderItemsCard, OrderSideCards, Card } from "./order-detail-sections"
import { OrderNotFound } from "./order-not-found"
import { OrderStatusPill } from "./order-status-pill"
import { OrderTimeline } from "./order-timeline"

/**
 * Chi tiết một đơn của khách: đầu trang (mã, ngày, trạng thái, nút hủy/mua lại), mốc thời gian, dòng hàng; bên phải địa chỉ, thanh toán, tiền.
 * Từ `lg` hai cột, dưới `lg` một cột. "Hủy đơn" chỉ khi PENDING, "Mua lại" khi COMPLETED/CANCELLED. `onReordered`: trang truyền vào (làm mới giỏ, mở ngăn kéo).
 */
function OrderDetailContent({ code, onReordered }: { code: string; onReordered: () => void }) {
  const { data: order, error, isError, refetch } = useOrder(code)
  const actions = useOrderActions({ onReordered })

  if (!order) {
    if (isError && error.statusCode === 404) return <OrderNotFound />
    if (isError) {
      return (
        <StateMessage
          icon={CircleAlert}
          title="Không tải được đơn hàng"
          titleAs="h1"
          description="Kiểm tra kết nối rồi thử lại."
          action={
            <Button type="button" variant="secondary" onClick={() => void refetch()} className="press rounded-4xl">
              Thử lại
            </Button>
          }
        />
      )
    }
    return <Skeleton role="status" aria-label="Đang tải đơn hàng" className="h-96 rounded-panel" />
  }

  const canReorder = order.status === "COMPLETED" || order.status === "CANCELLED"
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-serif text-h3 font-normal text-ink-muted italic">
            Đặt ngày {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
          </p>
          <h1 className="text-h1 text-ink uppercase">
            Đơn <span data-numeric>{order.code}</span>
          </h1>
          <OrderStatusPill status={order.status} className="self-start" />
        </div>
        <div className="flex flex-wrap gap-2">
          {canCustomerCancel(order) ? (
            <Button
              type="button"
              variant={canPayNow(order) ? "secondary" : "primary"}
              onClick={() => actions.requestCancel(order)}
              className="press rounded-4xl"
            >
              Hủy đơn
            </Button>
          ) : null}
          {canPayNow(order) ? (
            <Link to={orderPaymentPath(order.code)} className={cn(buttonVariants(), "press rounded-4xl")}>
              Thanh toán ngay
            </Link>
          ) : null}
        </div>
        {canReorder ? (
          <Button
            type="button"
            loading={actions.reorderingCode === order.code}
            onClick={() => actions.reorderOrder(order.code)}
            className="press rounded-4xl"
          >
            Mua lại
          </Button>
        ) : null}
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-6">
          <Card title="Tiến trình đơn hàng">
            <OrderTimeline order={order} />
          </Card>
          <OrderItemsCard order={order} />
        </div>
        <div className="flex flex-col gap-6">
          <OrderSideCards order={order} />
        </div>
      </div>
      <OrderActionDialogs actions={actions} />
    </div>
  )
}

export { OrderDetailContent }
