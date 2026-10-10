import { KpiCardsSkeleton } from "./kpi-cards"
import { RevenueChartSkeleton } from "./revenue-chart"
import { StatusBreakdownSkeleton } from "./status-breakdown"
import { TopProductsSkeleton } from "./top-products"
import { LowStockSkeleton } from "./low-stock"
import { RecentOrdersSkeleton } from "./recent-orders"

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-section">
      <KpiCardsSkeleton />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RevenueChartSkeleton />
        </div>
        <div className="min-w-0">
          <StatusBreakdownSkeleton />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="min-w-0">
          <TopProductsSkeleton />
        </div>
        <div className="min-w-0">
          <LowStockSkeleton />
        </div>
      </div>
      <RecentOrdersSkeleton />
    </div>
  )
}

export { DashboardSkeleton }
