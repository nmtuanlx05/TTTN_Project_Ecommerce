import { PageHeader } from "@/components/admin/page-header"
import { OrderStatusTabs } from "@/features/admin-orders/components/order-status-tabs"
import { OrdersContent } from "@/features/admin-orders/components/orders-content"
import { OrdersToolbar } from "@/features/admin-orders/components/orders-toolbar"
import { useAdminOrdersSearchParams } from "@/features/admin-orders/use-admin-orders-search-params"

function OrdersPage() {
  const search = useAdminOrdersSearchParams()

  return (
    <div className="flex flex-col gap-section">
      <PageHeader title="Đơn hàng" description="Xác nhận, giao hàng và theo dõi đơn qua từng trạng thái." />
      <div className="flex flex-col gap-stack">
        <OrderStatusTabs status={search.status} onSelect={search.setStatus} />
        <OrdersToolbar search={search} />
        <OrdersContent search={search} />
      </div>
    </div>
  )
}

export default OrdersPage
