import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { PageHeader } from "@/components/admin/page-header"
import { formatDateRange, formatTime } from "@/lib/format"
import {
  isRangePreset,
  previousRange,
  resolveRange,
  type DateRange,
  type RangePreset,
} from "@/lib/date-range"
import {
  MOCK_LATENCY_MS,
  getDashboardData,
  type DashboardData,
} from "@/lib/mock/dashboard"
import { DateRangePicker } from "./date-range-picker"
import { KpiCards, KpiCardsSkeleton } from "./kpi-cards"
import { RevenueChart, RevenueChartSkeleton } from "./revenue-chart"
import { StatusBreakdown, StatusBreakdownSkeleton } from "./status-breakdown"
import { TopProducts, TopProductsSkeleton } from "./top-products"
import { LowStock, LowStockSkeleton } from "./low-stock"
import { RecentOrders, RecentOrdersSkeleton } from "./recent-orders"

/**
 * Khoảng thời gian nằm trong query param (`?range=30d`), nên refresh hay chia
 * sẻ link đều giữ nguyên lựa chọn — không cần store toàn cục cho một mẩu state
 * sống trong đúng một trang.
 */
function useRangeState() {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get("range")
  const preset: RangePreset = isRangePreset(raw) ? raw : "30d"

  const [customRange, setCustomRange] = useState<DateRange>(() =>
    resolveRange("30d"),
  )

  const setPreset = (next: RangePreset) => {
    const params = new URLSearchParams(searchParams)
    params.set("range", next)
    setSearchParams(params, { replace: true })
  }

  const range = useMemo(
    () => resolveRange(preset, customRange),
    [preset, customRange],
  )

  return { preset, setPreset, customRange, setCustomRange, range }
}

function DashboardPage() {
  const { preset, setPreset, customRange, setCustomRange, range } = useRangeState()

  // Giữ cả khoảng đã tải cùng dữ liệu, nên "đang tải" là thứ suy ra được chứ
  // không phải một state thứ hai phải đồng bộ tay.
  const [loaded, setLoaded] = useState<{
    range: DateRange
    data: DashboardData
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      if (!cancelled) setLoaded({ range, data: getDashboardData(range) })
    }, MOCK_LATENCY_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [range])

  const data = loaded?.data ?? null
  const isRefreshing = loaded?.range !== range
  const comparison = previousRange(range)
  const isFirstLoad = data === null

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Tổng quan"
        description={`Số liệu từ ${formatDateRange(range.from, range.to)}, so với ${formatDateRange(comparison.from, comparison.to)}. Cập nhật lúc ${formatTime(new Date())}.`}
        actions={
          <DateRangePicker
            preset={preset}
            customRange={customRange}
            onPresetChange={setPreset}
            onCustomRangeChange={setCustomRange}
          />
        }
      />

      <p aria-live="polite" className="sr-only">
        {isRefreshing ? "Đang tải số liệu" : "Đã cập nhật số liệu"}
      </p>

      {isFirstLoad ? (
        <DashboardSkeleton />
      ) : (
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
      )}
    </div>
  )
}

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

export default DashboardPage
