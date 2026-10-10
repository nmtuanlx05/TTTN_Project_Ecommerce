import type { DashboardData } from "../mock"
import { KpiCards } from "./kpi-cards"
import { RevenueChart } from "./revenue-chart"
import { StatusBreakdown } from "./status-breakdown"
import { TopProducts } from "./top-products"
import { LowStock } from "./low-stock"
import { RecentOrders } from "./recent-orders"

function DashboardContent({
  data,
  isRefreshing,
}: {
  data: DashboardData
  isRefreshing: boolean
}) {
  return (
    // Lần đổi khoảng sau đó giữ nguyên bản cũ ở độ mờ thấp thay vì nháy
    // skeleton — không có cú nhảy bố cục
    <div
      className={
        isRefreshing
          ? "flex flex-col gap-section opacity-45 transition-opacity"
          : "flex flex-col gap-section transition-opacity"
      }
      aria-busy={isRefreshing}
    >
      <KpiCards current={data.current} previous={data.previous} />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RevenueChart
            series={data.series}
            previousSeries={data.previousSeries}
          />
        </div>
        <div className="min-w-0">
          <StatusBreakdown statusCounts={data.statusCounts} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="min-w-0">
          <TopProducts products={data.topProducts} />
        </div>
        <div className="min-w-0">
          <LowStock variants={data.lowStockVariants} />
        </div>
      </div>

      <RecentOrders orders={data.pendingOrders} />
    </div>
  )
}

export { DashboardContent }
