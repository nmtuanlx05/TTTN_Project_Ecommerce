import { useRef } from "react"
import { Link } from "react-router-dom"
import { CircleAlert, PackageOpen, SearchX } from "lucide-react"
import { Pagination } from "@/components/storefront/pagination"
import { StateMessage } from "@/components/storefront/state-message"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useOrderActions } from "../use-order-actions"
import { useOrdersSearchParams } from "../use-orders-search-params"
import { useMyOrders, useOrdersSummary } from "../queries"
import { OrderActionDialogs } from "./order-action-dialogs"
import { OrderCard } from "./order-card"
import { OrdersToolbar } from "./orders-toolbar"

function ListSkeleton() {
  return (
    <div role="status" aria-label="Đang tải đơn hàng" className="flex flex-col gap-4">
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} className="h-64 rounded-panel" />
      ))}
    </div>
  )
}

/**
 * Nội dung trang "Đơn hàng của tôi": thanh lọc, dòng "N đơn hàng", thẻ đơn, phân trang và mọi trạng thái (skeleton lần tải đầu, lỗi + thử lại,
 * chưa có đơn, không khớp bộ lọc, trang vượt tổng). Đổi lọc/trang thì giữ danh sách cũ, mờ nhẹ. `onReordered`: trang truyền vào để làm mới giỏ và mở ngăn kéo.
 */
function OrdersContent({ onReordered }: { onReordered: () => void }) {
  const search = useOrdersSearchParams()
  const orders = useMyOrders(search.params)
  const summary = useOrdersSummary()
  const actions = useOrderActions({ onReordered })
  const listRef = useRef<HTMLDivElement>(null)

  const focusList = () => {
    listRef.current?.scrollIntoView({ block: "start" })
    listRef.current?.focus({ preventScroll: true })
  }

  let body: React.ReactNode
  const data = orders.data
  if (!data) {
    body = orders.isError ? (
      <StateMessage
        icon={CircleAlert}
        title="Không tải được đơn hàng"
        description="Kiểm tra kết nối rồi thử lại."
        action={
          <Button type="button" variant="secondary" onClick={() => void orders.refetch()} className="press rounded-4xl">
            Thử lại
          </Button>
        }
      />
    ) : (
      <ListSkeleton />
    )
  } else if (data.items.length === 0) {
    if (data.meta.total > 0) {
      body = (
        <StateMessage
          icon={SearchX}
          title="Trang này không có đơn hàng"
          action={
            <Button type="button" variant="secondary" onClick={() => search.setPage(1)} className="press rounded-4xl">
              Về trang 1
            </Button>
          }
        />
      )
    } else if (search.hasFilters) {
      body = (
        <StateMessage
          icon={SearchX}
          title="Không có đơn hàng phù hợp"
          description="Thử đổi trạng thái hoặc mã đơn khác."
          action={
            <Button type="button" variant="secondary" onClick={search.clearFilters} className="press rounded-4xl">
              Xóa bộ lọc
            </Button>
          }
        />
      )
    } else {
      body = (
        <StateMessage
          icon={PackageOpen}
          title="Bạn chưa có đơn hàng nào"
          description="Khi đặt hàng, đơn của bạn sẽ hiện ở đây."
          action={
            <Link to="/products" className={cn(buttonVariants(), "press rounded-4xl")}>
              Tiếp tục mua sắm
            </Link>
          }
        />
      )
    }
  } else {
    body = (
      <div className="flex flex-col gap-8">
        <ul
          aria-busy={orders.isPlaceholderData}
          className={cn(
            "flex flex-col gap-4 transition-opacity duration-(--motion-base) ease-smooth",
            orders.isPlaceholderData && "opacity-60",
          )}
        >
          {data.items.map((order) => (
            <li key={order.id}>
              <OrderCard
                order={order}
                busy={actions.reorderingCode === order.code}
                onCancel={actions.requestCancel}
                onReorder={(item) => actions.reorderOrder(item.code)}
              />
            </li>
          ))}
        </ul>
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          hrefFor={search.hrefForPage}
          onNavigate={focusList}
        />
      </div>
    )
  }

  return (
    <div ref={listRef} tabIndex={-1} className="flex scroll-mt-header flex-col gap-4 outline-none">
      <OrdersToolbar
        group={search.group}
        q={search.q}
        summary={summary.data}
        onGroupChange={search.setGroup}
        onSearch={search.setQuery}
      />
      {data && data.items.length > 0 ? (
        <p aria-live="polite" className="text-body-sm text-ink-muted">
          {data.meta.total} đơn hàng
        </p>
      ) : null}
      {body}
      <OrderActionDialogs actions={actions} />
    </div>
  )
}

export { OrdersContent }
